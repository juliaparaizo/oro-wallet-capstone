from collections import Counter, defaultdict
from datetime import datetime
from typing import Any, Literal
import os
import json
import re

import boto3
from boto3.dynamodb.conditions import Key
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from openai import OpenAI

from app.config import settings
from app.dynamo import get_transactions_table, serialize_items

router = APIRouter()


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: list[ChatMessage] = Field(default_factory=list)
    user_name: str | None = None
    user_id: str | None = None


class ChatResponse(BaseModel):
    reply: str


def _parse_txn_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return None


def _map_category(raw: str | None, primary: str | None, detailed: str | None) -> str:
    candidate = (detailed or raw or primary or "").lower()
    primary_value = (primary or "").lower()

    if primary_value:
        if "food_and_drink" in primary_value:
            return "Dining Out"
        if "groceries" in primary_value:
            return "Groceries"
        if "transportation" in primary_value:
            return "Transportation"
        if "travel" in primary_value:
            return "Travel"
        if "rent_and_utilities" in primary_value:
            return "Housing"
        if "utilities" in primary_value:
            return "Utilities"
        if "healthcare" in primary_value:
            return "Healthcare"
        if "entertainment" in primary_value:
            return "Entertainment"
        if "education" in primary_value:
            return "Education"
        if "general_merchandise" in primary_value or "shops" in primary_value:
            return "Clothing"
        if "personal_care" in primary_value:
            return "Personal Care"
        if "income" in primary_value or "payroll" in primary_value:
            return "Income"
        if "loan" in primary_value or "credit" in primary_value or "debt" in primary_value or "payments" in primary_value:
            return "Debt Payments"
        if "transfer" in primary_value or "investments" in primary_value or "savings" in primary_value:
            return "Savings & Investments"

    if "rent" in candidate or "mortgage" in candidate or "housing" in candidate:
        return "Housing"
    if "utilities" in candidate or "electric" in candidate or "water" in candidate or "gas" in candidate:
        return "Utilities"
    if "transport" in candidate or "rideshare" in candidate or "uber" in candidate or "lyft" in candidate or "taxi" in candidate or "fuel" in candidate or "parking" in candidate:
        return "Transportation"
    if "grocery" in candidate or "supermarket" in candidate:
        return "Groceries"
    if "restaurant" in candidate or "dining" in candidate or "fast food" in candidate or "coffee" in candidate or "caf" in candidate or "food" in candidate:
        return "Dining Out"
    if "medical" in candidate or "health" in candidate or "pharmacy" in candidate or "doctor" in candidate:
        return "Healthcare"
    if "personal" in candidate or "beauty" in candidate or "spa" in candidate or "salon" in candidate:
        return "Personal Care"
    if "clothing" in candidate or "apparel" in candidate or "shoes" in candidate or "shops" in candidate:
        return "Clothing"
    if "entertainment" in candidate or "movie" in candidate or "music" in candidate or "gaming" in candidate or "sport" in candidate:
        return "Entertainment"
    if "travel" in candidate or "air" in candidate or "hotel" in candidate or "lodging" in candidate:
        return "Travel"
    if "education" in candidate or "tuition" in candidate or "school" in candidate:
        return "Education"
    if "child" in candidate or "family" in candidate or "daycare" in candidate:
        return "Childcare & Family"
    if "loan" in candidate or "debt" in candidate or "credit" in candidate or "payment" in candidate or "interest" in candidate:
        return "Debt Payments"
    if "savings" in candidate or "investment" in candidate or "invest" in candidate or "transfer" in candidate:
        return "Savings & Investments"
    if "income" in candidate or "salary" in candidate or "payroll" in candidate:
        return "Income"
    return "Miscellaneous"


def _load_user_transactions(user_id: str | None) -> list[dict[str, Any]]:
    if not user_id:
        return []

    table = get_transactions_table()
    response = table.query(KeyConditionExpression=Key("userId").eq(user_id))
    items = serialize_items(response.get("Items", []))
    return [item for item in items if isinstance(item, dict)]


def _build_grounded_reply(message: str, transactions: list[dict[str, Any]]) -> str | None:
    if not transactions:
        return None

    normalized = []
    for txn in transactions:
        txn_date = _parse_txn_date(str(txn.get("date") or ""))
        if txn_date is None:
            continue
        try:
            amount = float(txn.get("amount", 0) or 0)
        except (TypeError, ValueError):
            amount = 0.0
        normalized.append(
            {
                "name": str(txn.get("name") or "Transaction"),
                "amount": amount,
                "date": txn_date,
                "category": _map_category(
                    txn.get("category"),
                    txn.get("plaidPrimary"),
                    txn.get("plaidDetailed"),
                ),
            }
        )

    if not normalized:
        return None

    normalized.sort(key=lambda txn: txn["date"])
    latest_month = normalized[-1]["date"].strftime("%Y-%m")
    month_label = normalized[-1]["date"].strftime("%B %Y")
    monthly = [
        txn
        for txn in normalized
        if txn["date"].strftime("%Y-%m") == latest_month and txn["amount"] > 0
    ]
    if not monthly:
        return None

    lowered = message.lower()
    monthly_total = sum(txn["amount"] for txn in monthly)
    category_totals: defaultdict[str, float] = defaultdict(float)
    for txn in monthly:
        category_totals[txn["category"]] += txn["amount"]

    if "food" in lowered or "grocery" in lowered or "grocer" in lowered or "dining" in lowered or "restaurant" in lowered:
        food_categories = {"Groceries", "Dining Out"}
        food_txns = [txn for txn in monthly if txn["category"] in food_categories]
        if not food_txns:
            return f"Based on your currently synced transactions for {month_label}, I don't see any spending categorized as food, groceries, or dining out."

        total_food = sum(txn["amount"] for txn in food_txns)
        groceries = sum(txn["amount"] for txn in food_txns if txn["category"] == "Groceries")
        dining = sum(txn["amount"] for txn in food_txns if txn["category"] == "Dining Out")
        top_merchants = sorted(food_txns, key=lambda txn: txn["amount"], reverse=True)[:3]
        merchant_text = ", ".join(
            f'{txn["name"]} (${txn["amount"]:.2f})' for txn in top_merchants
        )
        return (
            f"Based on your currently synced transactions for {month_label}, you spent ${total_food:.2f} on food. "
            f"That includes ${groceries:.2f} on groceries and ${dining:.2f} on dining out. "
            f"Your largest food purchases were {merchant_text}."
        )

    if "spending" in lowered or "spent" in lowered or "summary" in lowered or "patterns" in lowered:
        top_categories = sorted(category_totals.items(), key=lambda item: item[1], reverse=True)[:3]
        top_text = "; ".join(f"{name} ${amount:.2f}" for name, amount in top_categories)
        return (
            f"Based on your currently synced transactions for {month_label}, your total spending is ${monthly_total:.2f}. "
            f"Your top categories are {top_text}. "
            f"If you want, I can break down one category in more detail."
        )

    return None


def _build_transaction_context(transactions: list[dict[str, Any]]) -> str:
    if not transactions:
        return (
            "No transaction data is available for this user. "
            "Do not claim to see spending details or Plaid data."
        )

    normalized: list[dict[str, Any]] = []
    for txn in transactions:
        try:
            amount = float(txn.get("amount", 0) or 0)
        except (TypeError, ValueError):
            amount = 0.0

        date = str(txn.get("date") or "")
        category = (
            txn.get("plaidDetailed")
            or txn.get("plaidPrimary")
            or txn.get("category")
            or "Uncategorized"
        )
        normalized.append(
            {
                "name": str(txn.get("name") or "Transaction"),
                "amount": amount,
                "date": date,
                "category": str(category),
                "source": str(txn.get("source") or "manual"),
            }
        )

    normalized.sort(key=lambda txn: txn["date"])
    recent = normalized[-12:]

    total_spend = sum(txn["amount"] for txn in normalized if txn["amount"] > 0)
    by_category: defaultdict[str, float] = defaultdict(float)
    source_counts: Counter[str] = Counter()
    for txn in normalized:
        if txn["amount"] > 0:
            by_category[txn["category"]] += txn["amount"]
        source_counts[txn["source"]] += 1

    top_categories = sorted(by_category.items(), key=lambda item: item[1], reverse=True)[:5]
    recent_lines = [
        f'- {txn["date"]}: {txn["name"]} (${txn["amount"]:.2f}, {txn["category"]})'
        for txn in recent
    ]
    category_lines = [f"- {name}: ${amount:.2f}" for name, amount in top_categories]
    source_lines = [f"- {source}: {count}" for source, count in source_counts.most_common()]

    return "\n".join(
        [
            "Use the following app transaction data as the source of truth for this user.",
            "These include imported Plaid/mock transactions already stored in the app.",
            f"Transaction count: {len(normalized)}",
            f"Total spending across available transactions: ${total_spend:.2f}",
            "Transactions by source:",
            *source_lines,
            "Top spending categories:",
            *(category_lines or ["- None"]),
            "Most recent transactions:",
            *recent_lines,
            "When asked about spending, cite patterns from this data directly.",
            "If the data is limited or unclear, say that the answer is based on the currently synced app transactions.",
        ]
    )


def _extract_reply_from_lambda(lambda_result: object) -> str:
    payload = lambda_result

    if isinstance(payload, dict) and "statusCode" in payload:
        status = int(payload.get("statusCode", 500))
        body = payload.get("body")
        if isinstance(body, str):
            try:
                body = json.loads(body)
            except json.JSONDecodeError:
                pass
        if status >= 400:
            detail = body if isinstance(body, str) else "Lambda returned an error"
            raise HTTPException(status_code=502, detail=str(detail))
        payload = body

    if isinstance(payload, dict):
        if "body" in payload:
            body = payload["body"]
            if isinstance(body, str):
                try:
                    payload = json.loads(body)
                except json.JSONDecodeError:
                    payload = {"reply": body}
            elif isinstance(body, dict):
                payload = body
        if isinstance(payload, dict):
            reply = (
                payload.get("reply")
                or payload.get("answer")
                or payload.get("response")
                or payload.get("message")
            )
            if isinstance(reply, str) and reply.strip():
                return reply.strip()

    if isinstance(payload, str) and payload.strip():
        return payload.strip()

    raise HTTPException(status_code=502, detail="Lambda response did not include a reply")


def _invoke_chat_lambda(payload: ChatRequest) -> str:
    if not settings.chat_lambda_function:
        raise HTTPException(status_code=500, detail="Chat Lambda function not configured")

    name = payload.user_name or "there"
    transactions = _load_user_transactions(payload.user_id)
    transaction_context = _build_transaction_context(transactions)
    system_prompt = (
        "You are Pulse, a friendly money coach inside a personal finance app. "
        "Keep responses concise (2-5 sentences), practical, and upbeat. "
        "Ask at most one clarifying question when needed. "
        "You have access to the user's in-app transaction data when it is provided in the system context. "
        "Base spending answers on that data instead of generic budgeting advice. "
        f"Address the user as {name}."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "system", "content": transaction_context},
    ]
    for item in payload.history[-8:]:
        messages.append({"role": item.role, "content": item.content})
    messages.append({"role": "user", "content": payload.message})

    session = boto3.Session(
        profile_name=settings.aws_profile, region_name=settings.aws_region
    )
    lambda_client = session.client("lambda")
    invoke_response = lambda_client.invoke(
        FunctionName=settings.chat_lambda_function,
        InvocationType="RequestResponse",
        Payload=json.dumps(
            {
                "user_query": payload.message,
                "message": payload.message,
                "history": [item.model_dump() for item in payload.history[-8:]],
                "user_name": payload.user_name,
                "user_id": payload.user_id,
                "transaction_context": transaction_context,
                "transactions": transactions[-25:],
                "messages": messages,
            }
        ).encode("utf-8"),
    )

    if invoke_response.get("FunctionError"):
        raise HTTPException(status_code=502, detail="Lambda invocation failed")

    raw_payload = invoke_response["Payload"].read()
    if not raw_payload:
        raise HTTPException(status_code=502, detail="Empty response from Lambda")

    try:
        lambda_result = json.loads(raw_payload.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="Invalid JSON from Lambda") from exc

    return _extract_reply_from_lambda(lambda_result)


@router.post("/chat", response_model=ChatResponse)
def chat_with_bot(payload: ChatRequest) -> ChatResponse:
    transactions = _load_user_transactions(payload.user_id)
    grounded_reply = _build_grounded_reply(payload.message, transactions)
    if grounded_reply:
        return ChatResponse(reply=grounded_reply)

    if settings.chat_lambda_function:
        try:
            return ChatResponse(reply=_invoke_chat_lambda(payload))
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Chat service unavailable: {type(exc).__name__}: {exc}",
            ) from exc

    api_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    client = OpenAI(api_key=api_key)

    name = payload.user_name or "there"
    transaction_context = _build_transaction_context(transactions)
    system_prompt = (
        "You are Pulse, a friendly money coach inside a personal finance app. "
        "Keep responses concise (2-5 sentences), practical, and upbeat. "
        "Ask at most one clarifying question when needed. "
        "You have access to the user's in-app transaction data when it is provided in the system context. "
        "Base spending answers on that data instead of generic budgeting advice. "
        f"Address the user as {name}."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "system", "content": transaction_context},
    ]
    for item in payload.history[-8:]:
        messages.append({"role": item.role, "content": item.content})
    messages.append({"role": "user", "content": payload.message})

    try:
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            temperature=0.4,
            max_tokens=240,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Chat service unavailable") from exc

    reply = response.choices[0].message.content or ""
    return ChatResponse(reply=reply.strip())
