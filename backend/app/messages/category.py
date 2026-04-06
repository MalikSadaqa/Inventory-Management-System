from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.utils import normalize_required_name


class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    parent_id: int | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return normalize_required_name(value)


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    parent_id: int | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return normalize_required_name(value)


class CategoryListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    parent_id: int | None
    created_at: datetime
    updated_at: datetime


class CategoryRead(CategoryListItem):
    pass


class CategoryTreeNode(BaseModel):
    id: int
    name: str
    parent_id: int | None
    children: list["CategoryTreeNode"] = Field(default_factory=list)
    is_leaf: bool


CategoryTreeNode.model_rebuild()
