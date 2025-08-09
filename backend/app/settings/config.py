import os
from pydantic import BaseModel
from typing import List


class Settings(BaseModel):
    ollama_host: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    data_dir: str = os.getenv("DATA_DIR", "/workspace/data")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
    default_chat_models: List[str] = os.getenv("DEFAULT_CHAT_MODELS", "llama3,mistral").split(",")
    cuda_enabled: bool = os.getenv("CUDA_ENABLED", "true").lower() == "true"
    allow_web_access: bool = os.getenv("ALLOW_WEB_ACCESS", "true").lower() == "true"


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        os.makedirs(os.getenv("DATA_DIR", "/workspace/data"), exist_ok=True)
        _settings = Settings()
    return _settings