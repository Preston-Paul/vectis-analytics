"""Application configuration loaded from environment variables / .env file."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central settings object for Vectis Analytics backend.

    All values can be overridden via environment variables or a .env file
    placed in the working directory when the server starts.
    """

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./vectis.db"

    # JWT / Auth
    SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # EIA API (energy commodity data)
    EIA_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


settings = Settings()
