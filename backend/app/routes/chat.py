from typing import Literal
import os
import json

import boto3
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from openai import OpenAI

from app.config import settings

router = APIRouter()


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: list[ChatMessage] = Field(default_factory=list)
    user_name: str | None = None


class ChatResponse(BaseModel):
    reply: str


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
    system_prompt = (
        "You are Pulse, a friendly money coach inside a personal finance app. "
        "Keep responses concise (2-5 sentences), practical, and upbeat. "
        "Ask at most one clarifying question when needed. "
        "Never claim to access bank data unless the user provided it. "
        f"Address the user as {name}."
    )

    messages = [{"role": "system", "content": system_prompt}]
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
    system_prompt = (
        "You are Pulse, a friendly money coach inside a personal finance app. "
        "Keep responses concise (2-5 sentences), practical, and upbeat. "
        "Ask at most one clarifying question when needed. "
        "Never claim to access bank data unless the user provided it. "
        f"Address the user as {name}."
    )

    messages = [{"role": "system", "content": system_prompt}]
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
