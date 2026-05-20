from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_KEY: str
    GOOGLE_API_KEY: str | None = None
    GOOGLE_MODEL: str = "gemini-1.5"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()