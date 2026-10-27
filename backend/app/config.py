"""Application configuration loaded from environment / .env file."""
from functools import lru_cache

from pydantic import EmailStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Auth
    SECRET_KEY: str = "dev-insecure-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database (sqlite locally; set DATABASE_URL to a postgres URL on Render).
    DATABASE_URL: str = "sqlite:///./lottery.db"

    # CORS: comma-separated allowed origins. Add your Vercel frontend URL in prod.
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Demo admin (created by the seeder)
    ADMIN_EMAIL: str = "admin@lottery-platform.com"
    ADMIN_PASSWORD: str = "admin12345"

    # Wallet bonus credited to new demo users
    SIGNUP_BONUS: float = 100.00

    # Draw mechanics defaults
    TICKET_PRICE: float = 10.00
    NUMBERS_PER_TICKET: int = 6
    NUMBER_RANGE_MIN: int = 1
    NUMBER_RANGE_MAX: int = 49


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
