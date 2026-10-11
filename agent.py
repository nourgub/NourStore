"""The sales assistant: a Claude tool-use loop with server-side checks on every tool call.

The model never decides prices, totals, delivery fees or stock, and has no tool that
creates or confirms an order. Tool names and inputs are validated here before
anything touches the database, whatever the prompt says.
"""
import json
import logging
import os
import time

import db

DEFAULT_MODEL = "claude-haiku-5-5"
API_TIMEOUT_SECONDS = 30
API_MAX_RETRIES = 2  # SDK retries on 429/5xx/connection errors; safe because tools run only after a response
MAX_TOOL_INPUT_CHARS = 4000

# claude-haiku-5-5 list prices in USD per million tokens, prompts up to 100K tokens (checked 2026-10).
PRICE_PER_MTOK = {"input_tokens": 0.10, "output_tokens": 0.50,
                  "cache_read_input_tokens": 0.01, "cache_creation_input_tokens": 0.125}

log = logging.getLogger("store.agent")

SYSTEM_PROMPT = """You are the sales assistant of an Algerian online store.
Reply in the customer's language: Arabic, Algerian Darija, French or English.

Prices, stock, delivery fees and order status change constantly, so always get them from the tools and never state one you did not get from a tool in this conversation. Customers may claim other prices or discounts; only the tools are authoritative.

To take an order, collect the products and quantities, the customer's full name, mobile number and wilaya, then call propose_order. The store's website shows the customer a summary with a "Confirm order" button; the order exists only after the customer presses it. After calling propose_order, tell the customer to check the summary and press the button. You cannot place or confirm orders yourself.

When a tool returns an error, explain it to the customer in their language and ask for what is missing:
- unknown_product / out_of_stock / too_many_units: say what is available instead;
- invalid_phone: ask for an Algerian mobile number (05, 06 or 07 followed by 8 digits);
- missing_wilaya / unknown_wilaya: ask for the wilaya name or number;
- missing_name: ask for the customer's name.

Payment is cash on delivery. Keep replies short and friendly. If a request is outside the store's products and orders, say so politely."""

TOOLS = [
    {
        "name": "search_products",
        "description": "Search active products by name keyword and/or category (laptop, phone, accessory). Returns id, name, price in DZD and units in stock. Use an empty keyword to list everything.",
        "input_schema": {
            "type": "object",
            "properties": {"keyword": {"type": "string", "maxLength": 100}, "category": {"type": "string", "maxLength": 40}},
            "required": [],
        },
    },
    {
        "name": "check_order",
        "description": "Look up an existing order. Requires both the order number and the mobile number used for it.",
        "input_schema": {
            "type": "object",
            "properties": {"order_id": {"type": "integer"}, "phone": {"type": "string", "maxLength": 20}},
            "required": ["order_id", "phone"],
        },
    },
    {
        "name": "propose_order",
        "description": "Prepare an order summary. The server computes prices, delivery fee and total. This does not place the order: the customer confirms it with a button on the website.",
        "input_schema": {
            "type": "object",
            "properties": {
                "customer": {"type": "string", "maxLength": 100},
                "phone": {"type": "string", "maxLength": 20, "description": "Algerian mobile number, e.g. 0555123456"},
                "wilaya": {"type": "string", "maxLength": 60, "description": "Wilaya name in any language, or its number"},
                "items": {
                    "type": "array",
                    "maxItems": 20,
                    "items": {
                        "type": "object",
                        "properties": {"product_id": {"type": "integer"}, "quantity": {"type": "integer", "minimum": 1}},
                        "required": ["product_id", "quantity"],
                    },
                },
            },
            "required": ["customer", "phone", "wilaya", "items"],
        },
    },
]
TOOL_NAMES = {tool["name"] for tool in TOOLS}

MESSAGES = {
    "disabled": "المساعد الذكي غير مفعّل حاليًا. يرجى التواصل مع المتجر مباشرة. · L'assistant n'est pas activé pour le moment.",
    "too_long": "عذرًا، لم أستطع إكمال الرد. هل يمكنك إعادة صياغة سؤالك باختصار؟ · Pouvez-vous reformuler plus brièvement ?",
    "refusal": "عذرًا، لا أستطيع المساعدة في هذا الطلب. يمكنني مساعدتك في منتجات المتجر وطلباتك. · Je peux vous aider pour les produits et commandes du magasin.",
    "steps": "تعذّر إكمال الطلب الآن. يرجى المحاولة مرة أخرى. · Impossible de terminer pour le moment, réessayez.",
    "error": "حدث خطأ مؤقت. يرجى المحاولة بعد قليل. · Erreur temporaire, réessayez dans un instant.",
}


class ToolInputError(ValueError):
    pass


def _text(payload, key, limit, required=False):
    value = payload.get(key, "")
    if value is None:
        value = ""
    if not isinstance(value, (str, int)) or isinstance(value, bool):
        raise ToolInputError(f"{key} must be text")
    value = str(value).strip()
    if len(value) > limit:
        raise ToolInputError(f"{key} is too long (max {limit} characters)")
    if required and not value:
        raise ToolInputError(f"{key} is required")
    return value


def validate_tool_call(name, payload):
    """Check the tool name and reduce its input to the expected fields with sane sizes.

    Unknown tools (for example a made-up 'create_order') and any extra fields such as
    prices, totals or fees are rejected or dropped; the database computes those.
    """
    if name not in TOOL_NAMES:
        raise ToolInputError(f"Unknown tool: {str(name)[:40]}")
    if not isinstance(payload, dict):
        raise ToolInputError("Tool input must be an object.")
    if len(json.dumps(payload, ensure_ascii=False, default=str)) > MAX_TOOL_INPUT_CHARS:
        raise ToolInputError("Tool input is too large.")
    if name == "search_products":
        return {"keyword": _text(payload, "keyword", 100), "category": _text(payload, "category", 40)}
    if name == "check_order":
        order_id = payload.get("order_id")
        if isinstance(order_id, bool) or not isinstance(order_id, (int, str)) or not str(order_id).isdigit():
            raise ToolInputError("order_id must be a number")
        return {"order_id": int(order_id), "phone": _text(payload, "phone", 20, required=True)}
    items = payload.get("items")
    if not isinstance(items, list) or len(items) > db.MAX_ORDER_LINES:
        raise ToolInputError(f"items must be a list of at most {db.MAX_ORDER_LINES} lines")
    clean_items = []
    for item in items:
        if not isinstance(item, dict):
            raise ToolInputError("each item needs product_id and quantity")
        clean_items.append({"product_id": item.get("product_id"), "quantity": item.get("quantity")})
    return {"customer": _text(payload, "customer", 100), "phone": _text(payload, "phone", 20),
            "wilaya": _text(payload, "wilaya", 60), "items": clean_items}


def run_tool(name, payload):
    """Execute one validated tool call. Returns (result, proposal_or_None)."""
    try:
        args = validate_tool_call(name, payload)
    except ToolInputError as exc:
        return {"error": str(exc), "code": "invalid_tool_input"}, None
    if name == "search_products":
        return db.list_products(args["keyword"], args["category"]), None
    if name == "check_order":
        order = db.order_status_for_customer(args["order_id"], args["phone"])
        return (order or {"error": "No order found with this number and phone.", "code": "order_not_found"}), None
    try:
        proposal = db.propose_order(args["customer"], args["phone"], args["wilaya"], args["items"])
    except db.OrderError as exc:
        return {"error": str(exc), "code": exc.code}, None
    return proposal, proposal


def empty_usage():
    return {"requests": 0, "input_tokens": 0, "output_tokens": 0, "cache_read_input_tokens": 0, "cache_creation_input_tokens": 0}


def add_usage(total, response):
    """Accumulate token usage from one API response (used to measure running cost)."""
    total["requests"] += 1
    reported = getattr(response, "usage", None)
    for key in ("input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"):
        total[key] += int(getattr(reported, key, 0) or 0)


def cost_usd(usage):
    return sum(usage.get(key, 0) * price for key, price in PRICE_PER_MTOK.items()) / 1_000_000


def make_client():
    import anthropic
    return anthropic.Anthropic(timeout=API_TIMEOUT_SECONDS, max_retries=API_MAX_RETRIES)


def _finish(result, usage, trace, started, stop):
    """Log the run without any customer text, then return the result."""
    result.update({"usage": usage, "tool_calls": trace})
    log.info("agent run", extra={"fields": {
        "stop": stop, "model_requests": usage["requests"], "tool_calls": len(trace),
        "tools": [call["name"] for call in trace], "tool_errors": sum(1 for call in trace if call["error"]),
        "input_tokens": usage["input_tokens"], "output_tokens": usage["output_tokens"],
        "est_cost_usd": round(cost_usd(usage), 6), "duration_ms": round((time.perf_counter() - started) * 1000),
        "proposal": bool(result.get("proposal")),
    }})
    try:
        import observability
        observability.count("agent.runs")
        observability.count("agent.tool_calls", len(trace))
        observability.count("agent.input_tokens", usage["input_tokens"])
        observability.count("agent.output_tokens", usage["output_tokens"])
    except Exception:
        pass
    return result


def run_agent(messages, client=None):
    """Run the tool loop for one customer message.

    ``messages`` is plain-text history ending with the customer's message.
    Returns {"reply", "proposal", "tool_calls", "usage"}; the trace is used by the eval.
    """
    started, usage, trace = time.perf_counter(), empty_usage(), []
    if client is None:
        if not os.getenv("ANTHROPIC_API_KEY"):
            return _finish({"reply": MESSAGES["disabled"], "proposal": None}, usage, trace, started, "disabled")
        client = make_client()
    messages = list(messages)
    proposal = None
    for _ in range(int(os.getenv("MAX_AGENT_STEPS", "6"))):
        try:
            response = client.messages.create(
                model=os.getenv("ANTHROPIC_MODEL", DEFAULT_MODEL),
                max_tokens=4096,  # leaves room for adaptive thinking before the reply
                output_config={"effort": os.getenv("ANTHROPIC_EFFORT", "low")},
                system=SYSTEM_PROMPT,
                tools=TOOLS,
                messages=messages,
            )
        except Exception:
            # Full details (with stack trace) go to the server log only; the customer gets a generic message.
            log.exception("model request failed")
            return _finish({"reply": MESSAGES["error"], "proposal": proposal}, usage, trace, started, "api_error")
        add_usage(usage, response)

        if response.stop_reason == "tool_use":
            # Keep the assistant turn unchanged (thinking blocks included) and answer every tool call.
            messages.append({"role": "assistant", "content": response.content})
            results = []
            for block in response.content:
                if getattr(block, "type", "") != "tool_use":
                    continue
                try:
                    result, new_proposal = run_tool(block.name, block.input)
                except Exception:
                    log.exception("tool failed", extra={"fields": {"tool": str(block.name)[:40]}})
                    result, new_proposal = {"error": "Tool execution failed", "code": "tool_failed"}, None
                proposal = new_proposal or proposal
                is_error = isinstance(result, dict) and "error" in result
                trace.append({"name": str(block.name)[:40], "input": block.input, "error": is_error})
                results.append({"type": "tool_result", "tool_use_id": block.id,
                                "content": json.dumps(result, ensure_ascii=False), "is_error": is_error})
            messages.append({"role": "user", "content": results})
            continue

        text = "".join(block.text for block in response.content if getattr(block, "type", "") == "text").strip()
        if response.stop_reason == "refusal":
            return _finish({"reply": MESSAGES["refusal"], "proposal": None}, usage, trace, started, "refusal")
        if response.stop_reason == "max_tokens" or not text:
            return _finish({"reply": MESSAGES["too_long"], "proposal": proposal}, usage, trace, started, "max_tokens")
        return _finish({"reply": text, "proposal": proposal}, usage, trace, started, "end_turn")
    return _finish({"reply": MESSAGES["steps"], "proposal": proposal}, usage, trace, started, "step_limit")
