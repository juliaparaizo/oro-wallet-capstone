from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    aws_profile: str = "poc-finance-app"
    aws_region: str = "sa-east-1"
    users_table: str = "Users"
    transactions_table: str = "Transactions"
    plaid_items_table: str = "PlaidItems"
    plaid_client_id: str | None = None
    plaid_secret: str | None = None
    plaid_env: str = "sandbox"
    plaid_products: str = "transactions"
    plaid_country_codes: str = "US"
    plaid_redirect_uri: str | None = None
    chat_lambda_function: str | None = None
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"


settings = Settings()
