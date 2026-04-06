from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import check_database_connection, init_db
from app.routers.categories import router as categories_router
from app.routers.customers import router as customers_router
from app.routers.invoices import router as invoices_router
from app.routers.items import router as items_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        init_db()
    except Exception:
        pass
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers_router)
app.include_router(categories_router)
app.include_router(items_router)
app.include_router(invoices_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    try:
        check_database_connection()
        return {"status": "ok", "database": "connected"}
    except Exception:
        return {"status": "degraded", "database": "disconnected"}
