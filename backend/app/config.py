import os
from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "Chambachat V2 API"
    APP_VERSION: str = "2.0.0"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./chambachat.db")
    CORS_ORIGINS: list = ["*"]

settings = Settings()
