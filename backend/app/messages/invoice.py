from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class InvoiceLineCreate(BaseModel):
    item_id: int = Field(ge=1)
    quantity: int = Field(gt=0)


class InvoiceCreate(BaseModel):
    customer_id: int = Field(ge=1)
    invoice_date: date
    items: list[InvoiceLineCreate] = Field(min_length=1)


class InvoiceCustomerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str | None
    phone: str | None


class InvoiceLineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int | None
    item_name_snapshot: str
    unit_price_snapshot: Decimal
    unit_cost_snapshot: Decimal | None
    category_id_snapshot: int | None
    category_path_snapshot: str | None
    quantity: int
    line_subtotal: Decimal


class InvoiceSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    invoice_number: str
    invoice_date: date
    total_quantity: int
    subtotal: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    total: Decimal
    created_at: datetime
    updated_at: datetime


class InvoiceDetailRead(InvoiceSummaryRead):
    customer: InvoiceCustomerRead
    lines: list[InvoiceLineRead]
