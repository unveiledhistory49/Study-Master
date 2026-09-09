import os
from pathlib import Path
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(dotenv_path=env_path)
except ImportError:
    pass

try:
    from pydantic_settings import BaseSettings
except (ImportError, SystemError, Exception):
    try:
        from pydantic import BaseModel
        class BaseSettings(BaseModel):
            def __init__(self, **kwargs):
                env_vars = {}
                for field in getattr(self, "model_fields", {}).keys():
                    if field in os.environ:
                        env_vars[field] = os.environ[field]
                super().__init__(**{**env_vars, **kwargs})
    except (ImportError, SystemError, Exception):
        class BaseSettings:
            def __init__(self, **kwargs):
                for key, val in kwargs.items():
                    setattr(self, key, val)
                for key in dir(self.__class__):
                    if not key.startswith("_") and key.isupper():
                        env_val = os.getenv(key)
                        if env_val is not None:
                            curr_val = getattr(self.__class__, key)
                            if isinstance(curr_val, int):
                                setattr(self, key, int(env_val))
                            elif isinstance(curr_val, float):
                                setattr(self, key, float(env_val))
                            elif isinstance(curr_val, list):
                                setattr(self, key, [x.strip() for x in env_val.split(",")])
                            else:
                                setattr(self, key, env_val)



class Settings(BaseSettings):
    SECRET_KEY: str = "studymaster-jwt-secret-key-2026-very-secure"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    DATABASE_URL: str = "sqlite+aiosqlite:///./studymaster.db"
    CORS_ORIGINS: list[str] = ["*"]

    
    # OpenCode Zen AI Configuration
    OPENCODE_ZEN_API_KEY: str = ""
    OPENCODE_ZEN_BASE_URL: str = "https://opencode.ai/zen/v1"
    OPENCODE_ZEN_MODEL: str = "muse-spark-1.2-contributor-free"
    OPENCODE_ZEN_DEFAULT_TEMPERATURE: float = 0.7
    OPENCODE_ZEN_DEFAULT_MAX_OUTPUT_TOKENS: int = 4096
    OPENCODE_ZEN_DEFAULT_REASONING_EFFORT: str = "medium"

    # Legacy / Alternative fallback
    NVIDIA_API_KEY: str = ""
    NVIDIA_API_URL: str = "https://integrate.api.nvidia.com/v1"
    NVIDIA_MODEL: str = "openai/gpt-oss-120b"

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()

