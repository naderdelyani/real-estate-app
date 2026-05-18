"""Application configuration loaded from environment variables."""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All environment variables consumed by the search service."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Service
    PORT:      int  = 4003
    LOG_LEVEL: str  = "info"

    # CORS
    CORS_ORIGINS: List[str] = ["*"]


settings = Settings()
