from pathlib import Path
import sys

import boto3
from botocore.exceptions import ClientError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings


def _table_exists(client, table_name: str) -> bool:
    try:
        client.describe_table(TableName=table_name)
        return True
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code")
        if code == "ResourceNotFoundException":
            return False
        raise


def _create_users_table(client) -> None:
    client.create_table(
        TableName=settings.users_table,
        AttributeDefinitions=[
            {"AttributeName": "userId", "AttributeType": "S"},
            {"AttributeName": "email", "AttributeType": "S"},
        ],
        KeySchema=[{"AttributeName": "userId", "KeyType": "HASH"}],
        BillingMode="PAY_PER_REQUEST",
        GlobalSecondaryIndexes=[
            {
                "IndexName": "EmailIndex",
                "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
                "Projection": {"ProjectionType": "ALL"},
            }
        ],
    )


def _create_transactions_table(client) -> None:
    client.create_table(
        TableName=settings.transactions_table,
        AttributeDefinitions=[
            {"AttributeName": "userId", "AttributeType": "S"},
            {"AttributeName": "txnId", "AttributeType": "S"},
        ],
        KeySchema=[
            {"AttributeName": "userId", "KeyType": "HASH"},
            {"AttributeName": "txnId", "KeyType": "RANGE"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )


def _create_plaid_items_table(client) -> None:
    client.create_table(
        TableName=settings.plaid_items_table,
        AttributeDefinitions=[
            {"AttributeName": "userId", "AttributeType": "S"},
            {"AttributeName": "itemId", "AttributeType": "S"},
        ],
        KeySchema=[
            {"AttributeName": "userId", "KeyType": "HASH"},
            {"AttributeName": "itemId", "KeyType": "RANGE"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )


def _ensure_table(client, table_name: str, create_fn) -> None:
    if _table_exists(client, table_name):
        print(f"Table exists: {table_name}")
        return
    print(f"Creating table: {table_name}")
    create_fn(client)
    waiter = client.get_waiter("table_exists")
    waiter.wait(TableName=table_name)
    print(f"Created table: {table_name}")


def main() -> None:
    session = boto3.Session(
        profile_name=settings.aws_profile, region_name=settings.aws_region
    )
    client = session.client("dynamodb")

    print(
        f"Bootstrapping DynamoDB in profile={settings.aws_profile}, region={settings.aws_region}"
    )
    _ensure_table(client, settings.users_table, _create_users_table)
    _ensure_table(client, settings.transactions_table, _create_transactions_table)
    _ensure_table(client, settings.plaid_items_table, _create_plaid_items_table)
    print("Done.")


if __name__ == "__main__":
    main()
