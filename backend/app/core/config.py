from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Gestar API"
    DATABASE_URL: str
    SECRET_KEY: str = "DEV_SECRET_KEY_CHANGE_ME"

    class Config:
        env_file = ".env"

settings = Settings()