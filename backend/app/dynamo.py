from decimal import Decimal
from typing import Any, Dict, List

import boto3

from app.config import settings


_session = None


def _get_session():
    global _session
    if _session is None:
        _session = boto3.Session(
            profile_name=settings.aws_profile, region_name=settings.aws_region
        )
    return _session


def get_dynamodb_resource():
    return _get_session().resource("dynamodb")


def get_transactions_table():
    return get_dynamodb_resource().Table(settings.transactions_table)


def get_users_table():
    return get_dynamodb_resource().Table(settings.users_table)


def get_plaid_items_table():
    return get_dynamodb_resource().Table(settings.plaid_items_table)


def _serialize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, dict):
        return {k: _serialize_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_serialize_value(v) for v in value]
    return value


def serialize_item(item: Dict[str, Any]) -> Dict[str, Any]:
    return {k: _serialize_value(v) for k, v in item.items()}


def serialize_items(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [serialize_item(item) for item in items]
