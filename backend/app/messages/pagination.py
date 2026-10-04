from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, Field


T = TypeVar("T")

DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 100


class PageParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE)


class Page(BaseModel, Generic[T]):
    items: list[T]
    page: int
    page_size: int
    total: int
