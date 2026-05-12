from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    # LLM
    openai_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434"
    llm_provider: str = "ollama"
    llm_model: str = "mistral"

    # App
    app_env: str = "development"
    log_level: str = "INFO"

    # MLflow
    mlflow_tracking_uri: str = "sqlite:///mlflow.db"
    mlflow_experiment_name: str = "resume-analyzer"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
