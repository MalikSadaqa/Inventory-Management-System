from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv


load_dotenv()


def _split_origins(value: str) -> list[str]:
    return [origin.strip() for origin in value.split(",") if origin.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "Inventory Management System API")
    app_host: str = os.getenv("APP_HOST", "0.0.0.0")
    app_port: int = int(os.getenv("APP_PORT", "8000"))
    postgres_db: str = os.getenv("POSTGRES_DB", "printing_app")
    postgres_user: str = os.getenv("POSTGRES_USER", "postgres")
    postgres_password: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    postgres_host: str = os.getenv("POSTGRES_HOST", "localhost")
    postgres_port: int = int(os.getenv("POSTGRES_PORT", "5432"))
    cors_origins: list[str] = field(
        default_factory=lambda: _split_origins(
            os.getenv(
                "CORS_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173",
            )
        )
    )

    @property
    def database_url(self) -> str:
        return (
            "postgresql+psycopg2://"
            f"{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


settings = Settings()
