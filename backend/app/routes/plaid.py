from __future__ import annotations

import time
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from boto3.dynamodb.conditions import Key

import plaid
from plaid.api import plaid_api
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.transactions_sync_request import TransactionsSyncRequest

from app.config import settings
from app.dynamo import get_plaid_items_table, get_transactions_table, serialize_item


router = APIRouter(prefix="/plaid", tags=["plaid"])


def _get_plaid_client() -> plaid_api.PlaidApi:
    if not settings.plaid_client_id or not settings.plaid_secret:
        raise HTTPException(status_code=500, detail="Plaid credentials not configured")

    env = settings.plaid_env.lower()
    if env == "production":
        host = plaid.Environment.Production
    elif env == "development":
        host = plaid.Environment.Development
    else:
        host = plaid.Environment.Sandbox

    configuration = plaid.Configuration(
        host=host,
        api_key={
            "clientId": settings.plaid_client_id,
            "secret": settings.plaid_secret,
            "plaidVersion": "2020-09-14",
        },
    )
    api_client = plaid.ApiClient(configuration)
    return plaid_api.PlaidApi(api_client)


def _products() -> list[Products]:
    return [Products(p.strip()) for p in settings.plaid_products.split(",") if p.strip()]


def _country_codes() -> list[CountryCode]:
    return [
        CountryCode(c.strip())
        for c in settings.plaid_country_codes.split(",")
        if c.strip()
    ]


class CreateLinkTokenRequest(BaseModel):
    userId: str = Field(min_length=1)


class ExchangePublicTokenRequest(BaseModel):
    userId: str = Field(min_length=1)
    public_token: str = Field(min_length=1)


@router.post("/create_link_token")
def create_link_token(payload: CreateLinkTokenRequest):
    client = _get_plaid_client()

    request = LinkTokenCreateRequest(
        products=_products(),
        client_name="Oro Wallet",
        country_codes=_country_codes(),
        language="en",
        user=LinkTokenCreateRequestUser(client_user_id=payload.userId),
    )
    if settings.plaid_redirect_uri:
        request["redirect_uri"] = settings.plaid_redirect_uri

    try:
        response = client.link_token_create(request)
        return response.to_dict()
    except plaid.ApiException as exc:
        raise HTTPException(status_code=400, detail=exc.body) from exc


@router.post("/exchange_public_token")
def exchange_public_token(payload: ExchangePublicTokenRequest):
    client = _get_plaid_client()
    try:
        request = ItemPublicTokenExchangeRequest(public_token=payload.public_token)
        response = client.item_public_token_exchange(request)
    except plaid.ApiException as exc:
        raise HTTPException(status_code=400, detail=exc.body) from exc

    table = get_plaid_items_table()
    item = {
        "userId": payload.userId,
        "itemId": response["item_id"],
        "access_token": response["access_token"],
        "item_id": response["item_id"],
        "cursor": "",
        "updated_at": int(time.time()),
    }
    table.put_item(Item=item)
    return {"item_id": response["item_id"]}


@router.get("/transactions")
def get_transactions(userId: str):
    table = get_plaid_items_table()
    try:
        response = table.query(KeyConditionExpression=Key("userId").eq(userId))
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    items = response.get("Items", [])
    if not items:
        raise HTTPException(status_code=404, detail="Plaid item not found for user")

    stored = serialize_item(max(items, key=lambda i: i.get("updated_at", 0)))
    access_token = stored.get("access_token")
    cursor = stored.get("cursor") or ""
    item_id = stored.get("itemId") or stored.get("item_id")
    if not access_token:
        raise HTTPException(status_code=400, detail="Missing access token")

    client = _get_plaid_client()

    added: list[dict[str, Any]] = []
    modified: list[dict[str, Any]] = []
    removed: list[dict[str, Any]] = []
    has_more = True

    try:
        while has_more:
            request = TransactionsSyncRequest(access_token=access_token, cursor=cursor)
            sync_response = client.transactions_sync(request).to_dict()
            cursor = sync_response["next_cursor"]
            added.extend(sync_response.get("added", []))
            modified.extend(sync_response.get("modified", []))
            removed.extend(sync_response.get("removed", []))
            has_more = sync_response.get("has_more", False)
    except plaid.ApiException as exc:
        raise HTTPException(status_code=400, detail=exc.body) from exc

    table.update_item(
        Key={"userId": userId, "itemId": item_id},
        UpdateExpression="SET #cursor = :cursor, updated_at = :updated_at",
        ExpressionAttributeNames={"#cursor": "cursor"},
        ExpressionAttributeValues={":cursor": cursor, ":updated_at": int(time.time())},
    )

    # Persist Plaid transactions into the main transactions table
    transactions_table = get_transactions_table()
    for txn in added:
        base_id = txn.get("transaction_id") or txn.get("pending_transaction_id")
        if not base_id:
            continue
        category = None
        raw_category = txn.get("category")
        if isinstance(raw_category, list) and raw_category:
            # Prefer the more specific (second) category if available.
            category = raw_category[1] if len(raw_category) > 1 else raw_category[0]
        elif isinstance(raw_category, str):
            category = raw_category

        pfc = txn.get("personal_finance_category") or {}
        pfc_primary = pfc.get("primary")
        pfc_detailed = pfc.get("detailed")
        date_value = txn.get("date")
        if date_value is not None and not isinstance(date_value, str):
            date_value = str(date_value)

        item = {
            "userId": userId,
            "txnId": f"plaid_{base_id}",
            "name": txn.get("name") or txn.get("merchant_name") or "Plaid Transaction",
            "amount": Decimal(str(txn.get("amount", 0))),
            "date": date_value or "",
            "category": category,
            "currency": txn.get("iso_currency_code") or txn.get("unofficial_currency_code"),
            "source": "plaid",
            "plaidPrimary": pfc_primary,
            "plaidDetailed": pfc_detailed,
        }
        transactions_table.put_item(Item=item)

    latest = sorted(added, key=lambda t: t.get("date", ""))[-20:]
    return {"added": latest, "modified": modified, "removed": removed}
