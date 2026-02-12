from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    aws_profile: str = "poc-finance-app"
    aws_region: str = "sa-east-1"
    users_table: str = "Users"
    transactions_table: str = "Transactions"
    plaid_items_table: str = "PlaidItems"


settings = Settings()
