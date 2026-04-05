from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    openai_api_key: str = ""
    openai_model: str = "google/gemma-3-27b-it:free"
    openai_base_url: str = "https://openrouter.ai/api/v1"
    app_name: str = "UCP Estimation API"
    app_version: str = "1.0.0"
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
