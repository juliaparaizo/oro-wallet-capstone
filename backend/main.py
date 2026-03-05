from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth import router as auth_router
from app.routes.transactions import router as transactions_router
from app.routes.chat import router as chat_router
from app.routes.plaid import router as plaid_router
from app.config import settings
import boto3

app = FastAPI(title="Capstone API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/debug")
def debug_info():
    info = {
        "aws_profile": settings.aws_profile,
        "aws_region": settings.aws_region,
        "users_table": settings.users_table,
        "transactions_table": settings.transactions_table,
        "plaid_items_table": settings.plaid_items_table,
    }
    try:
        session = boto3.Session(
            profile_name=settings.aws_profile, region_name=settings.aws_region
        )
        sts = session.client("sts")
        identity = sts.get_caller_identity()
        info["aws_account"] = identity.get("Account")
        info["aws_arn"] = identity.get("Arn")
    except Exception as exc:
        info["aws_error"] = str(exc)
    return info


app.include_router(transactions_router)
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(plaid_router)
