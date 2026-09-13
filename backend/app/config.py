import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    APP_NAME: str = "Chambachat V2 API"
    APP_VERSION: str = "2.0.0"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./chambachat.db")
    CORS_ORIGINS: list = ["*"]
    
    # DeepSeek LLM Configuration
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    DEEPSEEK_API_URL: str = os.getenv("DEEPSEEK_API_URL", "https://api.deepseek.com/chat/completions")

settings = Settings()
