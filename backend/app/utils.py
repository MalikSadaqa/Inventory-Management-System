from __future__ import annotations

import re


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class AppError(Exception):
    pass


class NotFoundError(AppError):
    pass


class BusinessRuleError(AppError):
    pass


def normalize_required_name(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError("Name is required.")
    return normalized


def normalize_optional_email(value: str | None) -> str | None:
    if value is None:
        return value

    normalized = value.strip()
    if not normalized:
        return None

    if not EMAIL_PATTERN.match(normalized):
        raise ValueError("Email must be a valid email address.")

    return normalized
