from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CustomerBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        if value is None:
            return value

        normalized = value.strip()
        if not normalized:
            return None

        if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
            raise ValueError("Email must be a valid email address.")

        return normalized


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    email: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        return CustomerBase.validate_email(value)


class CustomerListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str | None
    created_at: datetime
    updated_at: datetime


class CustomerRead(CustomerListItem):
    pass


class InvoiceSummary(BaseModel):
    id: int
    invoice_number: str | None = None
    total_amount: float | None = None
    status: str | None = None


class CustomerDetail(CustomerRead):
    invoices: list[InvoiceSummary] = Field(default_factory=list)


class CustomerSearchParams(BaseModel):
    search: str | None = Field(default=None, max_length=255)
