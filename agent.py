import json
import os
from db import create_order, get_order, list_products

SYSTEM_PROMPT = """You are a sales assistant for an Algerian store.
Reply in the customer's language (Arabic, Darija, French, or English).
Never guess product prices, stock, delivery fees, or order status: use tools.
Before creating an order, summarize products, quantity, total, name, phone and wilaya and ask for explicit confirmation.
Only call create_order when the customer clearly confirmed with yes/نعم/oui.
Keep replies concise and helpful."""

TOOLS = [
    {"name": "search_products", "description": "Search active products by keyword/category.", "input_schema": {"type": "object", "properties": {"keyword": {"type": "string"}, "category": {"type": "string"}}, "required": []}},
    {"name": "check_order", "description": "Check an order only with its order id and the phone used for it.", "input_schema": {"type": "object", "properties": {"order_id": {"type": "integer"}, "phone": {"type": "string"}}, "required": ["order_id", "phone"]}},
    {"name": "create_order", "description": "Create an order only after explicit customer confirmation.", "input_schema": {"type": "object", "properties": {"customer": {"type": "string"}, "phone": {"type": "string"}, "wilaya": {"type": "string"}, "items": {"type": "array", "items": {"type": "object", "properties": {"product_id": {"type": "integer"}, "quantity": {"type": "integer"}}, "required": ["product_id", "quantity"]}}, "confirmed": {"type": "boolean"}}, "required": ["customer", "phone", "wilaya", "items", "confirmed"]}},
]


def tool_call(name, payload):
    if name == "search_products":
        return list_products(payload.get("keyword", ""), payload.get("category", ""))
    if name == "check_order":
        order = get_order(payload["order_id"], payload["phone"])
        return order or {"error": "No order found with this number and phone."}
    if name == "create_order":
        return create_order(**payload)
    return {"error": "Unknown tool"}


def run_agent(messages):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return "المساعد الذكي غير مفعّل حاليًا. يرجى التواصل مع المتجر مباشرة."
    import anthropic
    client = anthropic.Anthropic(api_key=api_key)
    for _ in range(int(os.getenv("MAX_AGENT_STEPS", "8"))):
        response = client.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", "claude-3-5-haiku-latest"),
            max_tokens=700,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )
        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            return "".join(block.text for block in response.content if getattr(block, "type", "") == "text")
        results = []
        for block in response.content:
            if getattr(block, "type", "") == "tool_use":
                try:
                    result = tool_call(block.name, block.input)
                except Exception as exc:
                    result = {"error": "Tool execution failed"}
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": json.dumps(result, ensure_ascii=False)})
        messages.append({"role": "user", "content": results})
    return "تعذر إكمال الطلب الآن. يرجى المحاولة مرة أخرى."
