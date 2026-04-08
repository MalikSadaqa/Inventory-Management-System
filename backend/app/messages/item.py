from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.utils import normalize_required_name


class ItemBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    price: Decimal = Field(ge=0)
    cost: Decimal = Field(ge=0)
    category_id: int
    details: str | None = None
    tagged_customer_ids: list[int] = Field(default_factory=list)

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

    @field_validator("tagged_customer_ids")
    @classmethod
    def validate_tagged_customer_ids(cls, value: list[int]) -> list[int]:
        unique_ids: list[int] = []
        seen: set[int] = set()

        for customer_id in value:
            if customer_id < 1:
                raise ValueError("Tagged customer ids must be positive integers.")
            if customer_id not in seen:
                seen.add(customer_id)
                unique_ids.append(customer_id)

        return unique_ids


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    price: Decimal | None = Field(default=None, ge=0)
    cost: Decimal | None = Field(default=None, ge=0)
    category_id: int | None = None
    details: str | None = None
    tagged_customer_ids: list[int] | None = None

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

    @field_validator("tagged_customer_ids")
    @classmethod
    def validate_tagged_customer_ids(cls, value: list[int] | None) -> list[int] | None:
        if value is None:
            return value
        return ItemBase.validate_tagged_customer_ids(value)


class ItemCategorySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class ItemCustomerTagSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str | None


class ItemInvoiceAppearance(BaseModel):
    invoice_id: int
    invoice_number: str
    invoice_date: date
    quantity: int
    unit_price: Decimal
    line_total: Decimal


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
    tagged_customers: list[ItemCustomerTagSummary]
    invoice_appearances: list[ItemInvoiceAppearance]
    created_at: datetime
    updated_at: datetime
