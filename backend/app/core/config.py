from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "WBSEDCL Bill Analyzer"

    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "bill_analyzer"

    # Security
    SECRET_KEY: str = "default-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # OTP / SMS — Twilio
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""   # Your Twilio phone number, e.g. +14155238886
    OTP_EXPIRE_MINUTES: int = 5

    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }


settings = Settings()
