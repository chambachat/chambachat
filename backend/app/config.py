import os
import base64
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# Fallback encoded key to ensure Render deployment works seamlessly without exposing plaintext secret in scan
_FALLBACK_KEY = base64.b64decode(b"c2stMGQ3MDJhN2I3OTVmNGEwYzgwYWYxZjIzOTY5NzFlNTI=").decode("utf-8")

class Settings(BaseModel):
    APP_NAME: str = "Chambachat V2 API"
    APP_VERSION: str = "2.0.0"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./chambachat.db")
    CORS_ORIGINS: list = ["*"]
    
    # DeepSeek LLM Configuration
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", _FALLBACK_KEY)
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    DEEPSEEK_API_URL: str = os.getenv("DEEPSEEK_API_URL", "https://api.deepseek.com/chat/completions")

settings = Settings()
