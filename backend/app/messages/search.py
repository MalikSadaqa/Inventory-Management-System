from __future__ import annotations

from datetime import date
from decimal import Decimal
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class InvoiceLineSearchSortField(StrEnum):
    invoice_number = "invoice_number"
    invoice_date = "invoice_date"
    customer_name = "customer_name"
    item_name = "item_name"
    quantity = "quantity"
    unit_price = "unit_price"
    line_total = "line_total"


class SortDirection(StrEnum):
    asc = "asc"
    desc = "desc"


class InvoiceLineSearchQuery(BaseModel):
    item_id: int | None = Field(default=None, ge=1)
    item_name: str | None = None
    customer_name: str | None = None
    customer_email: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=25, ge=1, le=100)
    sort_by: InvoiceLineSearchSortField = InvoiceLineSearchSortField.invoice_date
    sort_direction: SortDirection = SortDirection.desc

    @field_validator("item_name", "customer_name", "customer_email", mode="before")
    @classmethod
    def normalize_text_filter(cls, value: str | None) -> str | None:
        if value is None:
            return None

        normalized = value.strip()
        return normalized or None

    @model_validator(mode="after")
    def validate_date_range(self) -> "InvoiceLineSearchQuery":
        if self.date_from and self.date_to and self.date_from > self.date_to:
            raise ValueError("date_from must be on or before date_to.")
        return self


class InvoiceLineSearchRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    invoice_line_id: int
    item_id: int | None
    item_name: str
    invoice_id: int
    invoice_number: str
    invoice_date: date
    customer_id: int
    customer_name: str
    customer_email: str | None
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class InvoiceLineSearchResponse(BaseModel):
    items: list[InvoiceLineSearchRow]
    page: int
    page_size: int
    total: int
