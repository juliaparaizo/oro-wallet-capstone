import base64
import hashlib
import hmac
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from boto3.dynamodb.conditions import Attr
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

from app.dynamo import get_users_table, serialize_item

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class SignupRequest(BaseModel):
    firstName: str = Field(min_length=1)
    lastName: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)


class AuthResponse(BaseModel):
    userId: str
    firstName: str
    lastName: str
    email: EmailStr


def _hash_password(password: str, salt: Optional[bytes] = None) -> str:
    if salt is None:
        salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return f"{base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        salt_b64, hash_b64 = stored.split("$", 1)
        salt = base64.b64decode(salt_b64.encode())
        expected = base64.b64decode(hash_b64.encode())
    except Exception:
        return False
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return hmac.compare_digest(dk, expected)


def _get_password_hash_field(user: dict) -> str:
    if "passwordHash" in user and user["passwordHash"]:
        return user["passwordHash"]
    return user.get("password", "")


def _find_user_by_email(email: str):
    table = get_users_table()
    response = table.scan(FilterExpression=Attr("email").eq(email))
    items = response.get("Items", [])
    if not items:
        return None
    return serialize_item(items[0])


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    user = _find_user_by_email(payload.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    stored_password = _get_password_hash_field(user)
    if not _verify_password(payload.password, stored_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {
        "userId": user["userId"],
        "firstName": user["firstName"],
        "lastName": user["lastName"],
        "email": user["email"],
    }


@router.post("/signup", response_model=AuthResponse)
def signup(payload: SignupRequest):
    table = get_users_table()
    existing = _find_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:10]}"
    item = {
        "userId": user_id,
        "firstName": payload.firstName,
        "lastName": payload.lastName,
        "email": payload.email,
        "passwordHash": _hash_password(payload.password),
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    table.put_item(Item=item)
    return {
        "userId": user_id,
        "firstName": payload.firstName,
        "lastName": payload.lastName,
        "email": payload.email,
    }
