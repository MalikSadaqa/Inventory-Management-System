from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.utils import normalize_optional_email, normalize_required_name


class CustomerBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return normalize_required_name(value)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        return normalize_optional_email(value)


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    email: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return normalize_required_name(value)

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
