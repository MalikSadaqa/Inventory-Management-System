from __future__ import annotations

import pytest

from app.utils import normalize_optional_email, normalize_optional_phone, normalize_required_name


def test_required_name_is_trimmed():
    assert normalize_required_name("  Ann  ") == "Ann"


def test_required_name_rejects_blank():
    with pytest.raises(ValueError, match="Name is required"):
        normalize_required_name("   ")


@pytest.mark.parametrize("value", [None, "", "   "])
def test_optional_email_treats_blank_as_missing(value):
    assert normalize_optional_email(value) is None


def test_optional_email_accepts_and_trims_valid_address():
    assert normalize_optional_email(" ann@example.com ") == "ann@example.com"


@pytest.mark.parametrize("value", ["ann", "ann@", "@example.com", "ann@example", "a b@example.com"])
def test_optional_email_rejects_invalid_address(value):
    with pytest.raises(ValueError, match="valid email"):
        normalize_optional_email(value)


@pytest.mark.parametrize("value", ["+1 (555) 123-4567", "0791234567", "1234567"])
def test_optional_phone_accepts_common_formats(value):
    assert normalize_optional_phone(value) == value


@pytest.mark.parametrize("value", [None, "", "  "])
def test_optional_phone_treats_blank_as_missing(value):
    assert normalize_optional_phone(value) is None


def test_optional_phone_rejects_letters():
    with pytest.raises(ValueError, match="may only contain"):
        normalize_optional_phone("555-CALL-NOW")


@pytest.mark.parametrize("value", ["123456", "1" * 21])
def test_optional_phone_rejects_too_few_or_too_many_digits(value):
    with pytest.raises(ValueError, match="between 7 and 20 digits"):
        normalize_optional_phone(value)
