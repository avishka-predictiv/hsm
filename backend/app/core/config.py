from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_NAME: str = "HMS - Hospital Management System"
    APP_ENV: str = "development"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/hms_db"

    # JWT
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    # Frontend
    FRONTEND_URL: str = "http://localhost:5173"

    # Email
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_TLS: bool = True
    MAIL_SSL: bool = False

    # Twilio SMS
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""   # e.g. +14155238886

    # Storage
    UPLOAD_DIR: str = "./uploads"

    # Admin seed
    ADMIN_EMAIL: str = "admin@hms.com"
    ADMIN_PASSWORD: str = "Admin@123456"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
