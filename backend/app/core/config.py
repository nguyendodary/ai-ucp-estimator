import logging

from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    openai_api_key: str = ""
    openai_model: str = "google/gemma-4-26b-a4b-it:free"
    openai_base_url: str = "https://openrouter.ai/api/v1"
    # Fallback models in order of preference
    fallback_models: list[str] = [
        "google/gemma-3-12b:free",
        "openrouter/free",
    ]
    app_name: str = "UCP Estimation API"
    app_version: str = "1.0.0"
    log_level: str = "INFO"
    database_url: str = "sqlite:///./data/ucp_estimation.db"
    db_echo: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def validate_config(self) -> None:
        """Validate critical configuration settings."""
        if not self.openai_api_key:
            logger.warning("OPENAI_API_KEY is not set. AI features will not work.")
        elif self.openai_api_key.startswith("sk-or-"):
            logger.info("Using OpenRouter API key.")
        elif self.openai_api_key.startswith("gsk_"):
            logger.info("Using Groq API key.")
        else:
            logger.info("Using generic OpenAI-compatible API key.")


settings = Settings()
settings.validate_config()
