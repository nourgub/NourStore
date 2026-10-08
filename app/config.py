import os
from dataclasses import dataclass

@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./enterprise_ai.db")
    llm_provider: str = os.getenv("LLM_PROVIDER", "mock")
    llm_model: str = os.getenv("LLM_MODEL", "")
    llm_api_key: str = os.getenv("LLM_API_KEY", "")
    llm_base_url: str = os.getenv("LLM_BASE_URL", "")
    llm_timeout: float = float(os.getenv("LLM_TIMEOUT", "20"))
    auto_approval_limit: float = float(os.getenv("AUTO_APPROVAL_LIMIT", "100"))
    confidence_threshold: float = float(os.getenv("CLASSIFIER_CONFIDENCE_THRESHOLD", "0.70"))
settings = Settings()
