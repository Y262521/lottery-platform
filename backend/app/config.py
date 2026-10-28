"""Application settings loaded from environment / .env file."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Auth
    SECRET_KEY: str = "dev-insecure-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "sqlite:///./lottery.db"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173"

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # Chapa
    CHAPA_SECRET_KEY: str = ""
    CHAPA_WEBHOOK_SECRET: str = ""
    CHAPA_BASE_URL: str = "https://api.chapa.co/v1"

    # Telebirr
    TELEBIRR_APP_ID: str = ""
    TELEBIRR_APP_KEY: str = ""
    TELEBIRR_SHORT_CODE: str = ""
    TELEBIRR_BASE_URL: str = "https://196.188.120.3:38443/api/it/pay/gateway"

    # Resend (email)
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "noreply@lottery-platform.com"

    # App
    FRONTEND_URL: str = "http://localhost:5173"
    ADMIN_EMAIL: str = "yonasteklu284@gmail.com"
    ADMIN_PASSWORD: str = "yona@1230"

    # ── Manual payment account details (shown to users on checkout) ───────────
    # Set these in your Render environment variables.
    TELEBIRR_ACCOUNT: str = ""        # e.g. 0912345678
    TELEBIRR_NAME: str = "Yona Online Draw"
    MPESA_ACCOUNT: str = ""           # e.g. 0712345678
    MPESA_NAME: str = "Yona Online Draw"
    CBE_ACCOUNT: str = ""             # Commercial Bank of Ethiopia account number
    CBE_NAME: str = "Yona Online Draw"
    AWASH_ACCOUNT: str = ""           # Awash Bank account (optional)
    AWASH_NAME: str = "Yona Online Draw"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
