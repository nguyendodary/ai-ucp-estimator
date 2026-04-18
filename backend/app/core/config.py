import logging

from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    openai_api_key: str = ""
    openai_model: str = "google/gemma-4-26b-a4b-it:free"
    openai_base_url: str = "https://openrouter.ai/api/v1"
    # Fallback models — deliberately span different provider chains so that
    # a single upstream outage (e.g. OpenInference down) doesn't kill all options.
    # Tier-1: own-infrastructure providers (Moonshot, Z.ai, MiniMax)
    # Tier-2: broader free-tier alternatives
    fallback_models: list[str] = [
        "moonshotai/kimi-k2.5",  # Moonshot AI — own infra, 256k ctx, fully free
        "z-ai/glm-4.5-air:free",  # Z.ai — own infra, 131k ctx, fully free
        "minimax/minimax-m2.5:free",  # MiniMax — own infra, 196k ctx, fully free
        "meta-llama/llama-3.3-70b-instruct:free",  # Meta / multiple hosts, 65k ctx
        "nousresearch/hermes-3-llama-3.1-405b:free",  # Nous Research, 131k ctx
        "google/gemma-4-31b-it:free",  # Google — same family as primary, 262k ctx
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
