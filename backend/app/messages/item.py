from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.utils import normalize_required_name


class ItemBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    price: Decimal = Field(ge=0)
    cost: Decimal = Field(ge=0)
    category_id: int
    details: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return normalize_required_name(value)

    @field_validator("details")
    @classmethod
    def validate_details(cls, value: str | None) -> str | None:
        if value is None:
            return value

        normalized = value.strip()
        return normalized or None


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    price: Decimal | None = Field(default=None, ge=0)
    cost: Decimal | None = Field(default=None, ge=0)
    category_id: int | None = None
    details: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return normalize_required_name(value)

    @field_validator("details")
    @classmethod
    def validate_details(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip()
        return normalized or None


class ItemCategorySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class ItemListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    price: Decimal
    cost: Decimal
    category_id: int
    details: str | None
    created_at: datetime
    updated_at: datetime


class ItemRead(ItemListItem):
    pass


class ItemDetail(BaseModel):
    id: int
    name: str
    price: Decimal
    cost: Decimal
    details: str | None
    category: ItemCategorySummary
    category_path: list[str]
    created_at: datetime
    updated_at: datetime
