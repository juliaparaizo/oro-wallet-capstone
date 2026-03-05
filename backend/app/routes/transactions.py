from typing import List, Optional
import uuid
from decimal import Decimal

from boto3.dynamodb.conditions import Key
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.dynamo import get_transactions_table, serialize_items

router = APIRouter()

class CreateTransaction(BaseModel):
    userId: str
    name: str
    amount: float
    date: str
    category: str | None = None
    currency: Optional[str] = None
    source: Optional[str] = None
    plaidPrimary: Optional[str] = None
    plaidDetailed: Optional[str] = None


class Transaction(BaseModel):
    userId: str
    txnId: str
    name: str
    amount: float
    date: str
    category: str | None = None
    currency: Optional[str] = None
    source: Optional[str] = None
    plaidPrimary: Optional[str] = None
    plaidDetailed: Optional[str] = None


class TransactionsResponse(BaseModel):
    items: List[Transaction]


@router.get("/transactions", response_model=TransactionsResponse)
def list_transactions(userId: str = Query(..., min_length=1)):
    table = get_transactions_table()
    try:
        response = table.query(KeyConditionExpression=Key("userId").eq(userId))
    except Exception as exc:  # pragma: no cover - surfaces to caller
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    items = serialize_items(response.get("Items", []))
    return {"items": items}


@router.post("/transactions", response_model=Transaction)
def create_transaction(payload: CreateTransaction):
    table = get_transactions_table()
    try:
        txn_id = f"txn_{uuid.uuid4().hex[:12]}"
        item = {
            "userId": payload.userId,
            "txnId": txn_id,
            "name": payload.name,
            "amount": Decimal(str(payload.amount)),
            "date": payload.date,
            "category": payload.category,
        }
        if payload.currency:
            item["currency"] = payload.currency
        if payload.source:
            item["source"] = payload.source
        if payload.plaidPrimary:
            item["plaidPrimary"] = payload.plaidPrimary
        if payload.plaidDetailed:
            item["plaidDetailed"] = payload.plaidDetailed
        table.put_item(Item=item)
    except Exception as exc:  # pragma: no cover - surfaces to caller
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return item
