from __future__ import annotations

import re


EMAIL_PATTERN = re.compile(
    r"^(?=.{1,254}$)(?=.{1,64}@)[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@"
    r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
    r"(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$"
)
PHONE_ALLOWED_PATTERN = re.compile(r"^[0-9+\-() ]+$")


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


def normalize_optional_phone(value: str | None) -> str | None:
    if value is None:
        return value

    normalized = value.strip()
    if not normalized:
        return None

    if not PHONE_ALLOWED_PATTERN.match(normalized):
        raise ValueError("Phone may only contain digits, spaces, +, -, and parentheses.")

    digits_only = re.sub(r"\D", "", normalized)
    if len(digits_only) < 7 or len(digits_only) > 20:
        raise ValueError("Phone must contain between 7 and 20 digits.")

    return normalized
