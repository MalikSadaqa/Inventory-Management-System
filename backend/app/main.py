from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db import check_database_connection, init_db
from app.routers.categories import router as categories_router
from app.routers.customers import router as customers_router
from app.routers.invoices import router as invoices_router
from app.routers.items import router as items_router
from app.routers.search import router as search_router
from app.utils import AppError, BusinessRuleError, ConflictError, NotFoundError


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        init_db()
    except Exception:
        logger.exception("Database initialization failed; tables may be missing.")
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(_: Request, error: AppError) -> JSONResponse:
    if isinstance(error, NotFoundError):
        status_code = status.HTTP_404_NOT_FOUND
    elif isinstance(error, ConflictError):
        status_code = status.HTTP_409_CONFLICT
    elif isinstance(error, BusinessRuleError):
        status_code = status.HTTP_400_BAD_REQUEST
    else:
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    return JSONResponse(status_code=status_code, content={"detail": str(error)})


app.include_router(customers_router)
app.include_router(categories_router)
app.include_router(items_router)
app.include_router(invoices_router)
app.include_router(search_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    try:
        check_database_connection()
        return {"status": "ok", "database": "connected"}
    except Exception:
        return {"status": "degraded", "database": "disconnected"}
