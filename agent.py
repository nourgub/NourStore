import json
import os

import db

DEFAULT_MODEL = "claude-haiku-5-5"

SYSTEM_PROMPT = """You are the sales assistant of an Algerian online store.
Reply in the customer's language: Arabic, Algerian Darija, French or English.

Prices, stock, delivery fees and order status change constantly, so always get them from the tools and never state one you did not get from a tool in this conversation.

To take an order, collect the products and quantities, the customer's full name, mobile number and wilaya, then call propose_order. The store's website shows the customer a summary with a "Confirm order" button; the order exists only after the customer presses it. After calling propose_order, tell the customer to check the summary and press the button. You cannot place or confirm orders yourself.

Payment is cash on delivery. Keep replies short and friendly. If a request is outside the store's products and orders, say so politely."""

TOOLS = [
    {
        "name": "search_products",
        "description": "Search active products by name keyword and/or category (laptop, phone, accessory). Returns id, name, price in DZD and units in stock. Use an empty keyword to list everything.",
        "input_schema": {
            "type": "object",
            "properties": {"keyword": {"type": "string"}, "category": {"type": "string"}},
            "required": [],
        },
    },
    {
        "name": "check_order",
        "description": "Look up an existing order. Requires both the order number and the mobile number used for it.",
        "input_schema": {
            "type": "object",
            "properties": {"order_id": {"type": "integer"}, "phone": {"type": "string"}},
            "required": ["order_id", "phone"],
        },
    },
    {
        "name": "propose_order",
        "description": "Prepare an order summary with the delivery fee and total. This does not place the order: the customer confirms it with a button on the website.",
        "input_schema": {
            "type": "object",
            "properties": {
                "customer": {"type": "string"},
                "phone": {"type": "string", "description": "Algerian mobile number, e.g. 0555123456"},
                "wilaya": {"type": "string"},
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {"product_id": {"type": "integer"}, "quantity": {"type": "integer"}},
                        "required": ["product_id", "quantity"],
                    },
                },
            },
            "required": ["customer", "phone", "wilaya", "items"],
        },
    },
]

MESSAGES = {
    "disabled": "المساعد الذكي غير مفعّل حاليًا. يرجى التواصل مع المتجر مباشرة.",
    "too_long": "عذرًا، لم أستطع إكمال الرد. هل يمكنك إعادة صياغة سؤالك باختصار؟",
    "refusal": "عذرًا، لا أستطيع المساعدة في هذا الطلب. يمكنني مساعدتك في منتجات المتجر وطلباتك.",
    "steps": "تعذّر إكمال الطلب الآن. يرجى المحاولة مرة أخرى.",
    "error": "حدث خطأ مؤقت. يرجى المحاولة بعد قليل.",
}


def run_tool(name, payload):
    """Execute one tool call. Returns (result, proposal_or_None)."""
    if not isinstance(payload, dict):
        return {"error": "Invalid tool input."}, None
    if name == "search_products":
        return db.list_products(str(payload.get("keyword", "")), str(payload.get("category", ""))), None
    if name == "check_order":
        order = db.get_order(payload.get("order_id"), payload.get("phone", ""))
        return (order or {"error": "No order found with this number and phone."}), None
    if name == "propose_order":
        try:
            proposal = db.propose_order(payload.get("customer", ""), payload.get("phone", ""),
                                        payload.get("wilaya", ""), payload.get("items", []))
        except db.OrderError as exc:
            return {"error": str(exc)}, None
        return proposal, proposal
    return {"error": "Unknown tool"}, None


def make_client():
    import anthropic
    return anthropic.Anthropic()


def run_agent(messages, client=None):
    """Run the tool loop for one customer message.

    ``messages`` is plain-text history ending with the customer's message.
    Returns {"reply", "proposal", "tool_calls"}; the trace is used by the eval.
    """
    if client is None:
        if not os.getenv("ANTHROPIC_API_KEY"):
            return {"reply": MESSAGES["disabled"], "proposal": None, "tool_calls": []}
        client = make_client()
    messages = list(messages)
    proposal, trace = None, []
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
            return {"reply": MESSAGES["error"], "proposal": proposal, "tool_calls": trace}

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
                    result, new_proposal = {"error": "Tool execution failed"}, None
                proposal = new_proposal or proposal
                trace.append({"name": block.name, "input": block.input, "error": "error" in result if isinstance(result, dict) else False})
                results.append({"type": "tool_result", "tool_use_id": block.id,
                                "content": json.dumps(result, ensure_ascii=False),
                                "is_error": isinstance(result, dict) and "error" in result})
            messages.append({"role": "user", "content": results})
            continue

        text = "".join(block.text for block in response.content if getattr(block, "type", "") == "text").strip()
        if response.stop_reason == "refusal":
            return {"reply": MESSAGES["refusal"], "proposal": None, "tool_calls": trace}
        if response.stop_reason == "max_tokens" or not text:
            return {"reply": MESSAGES["too_long"], "proposal": proposal, "tool_calls": trace}
        return {"reply": text, "proposal": proposal, "tool_calls": trace}
    return {"reply": MESSAGES["steps"], "proposal": proposal, "tool_calls": trace}
