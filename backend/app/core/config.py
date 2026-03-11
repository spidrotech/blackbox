from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    PROJECT_NAME: str = "Gestar API"
    DATABASE_URL: str
    SECRET_KEY: str = "DEV_SECRET_KEY_CHANGE_ME"
    APP_ENV: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM_EMAIL: str = "no-reply@gestar.local"
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    RESET_TOKEN_EXPIRE_MINUTES: int = 30
    EXPOSE_PASSWORD_RESET_LINK: bool = Field(default=False)
    COMPANY_SEARCH_API_URL: str = "https://recherche-entreprises.api.gouv.fr/search"
    COMPANY_SEARCH_TIMEOUT_SECONDS: int = 8
    COMPANY_SEARCH_USER_AGENT: str = "gestar-app/1.0"

    class Config:
        env_file = ".env"

settings = Settings()