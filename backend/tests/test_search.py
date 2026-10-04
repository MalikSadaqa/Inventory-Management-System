from __future__ import annotations

import pytest


@pytest.fixture
def invoice_lines(api):
    """Three invoices: Ann buys pens in January and March, Bob buys a banner in February."""
    category = api.category()
    pen = api.item(category["id"], name="Blue Pen", price="2.00")
    banner = api.item(category["id"], name="Banner", price="50.00")
    ann = api.customer("Ann", email="ann@example.com")
    bob = api.customer("Bob", email="bob@example.com")
    return {
        "pen": pen,
        "jan": api.invoice(ann["id"], [(pen["id"], 1)], invoice_date="2026-01-10"),
        "feb": api.invoice(bob["id"], [(banner["id"], 2)], invoice_date="2026-02-10"),
        "mar": api.invoice(ann["id"], [(pen["id"], 5)], invoice_date="2026-03-10"),
    }


def search(client, **params):
    response = client.get("/search/invoice-lines", params=params)
    assert response.status_code == 200, response.text
    return response.json()


def test_search_without_filters_returns_all_lines_newest_first(client, invoice_lines):
    body = search(client)

    assert body["total"] == 3
    assert [row["invoice_date"] for row in body["items"]] == ["2026-03-10", "2026-02-10", "2026-01-10"]


def test_search_by_item_name(client, invoice_lines):
    body = search(client, item_name="pen")

    assert body["total"] == 2
    assert {row["item_name"] for row in body["items"]} == {"Blue Pen"}


def test_search_by_item_id(client, invoice_lines):
    body = search(client, item_id=invoice_lines["pen"]["id"])

    assert body["total"] == 2


def test_search_by_customer_name_and_email(client, invoice_lines):
    assert search(client, customer_name="bob")["total"] == 1
    assert search(client, customer_email="ann@")["total"] == 2


def test_search_by_date_range_is_inclusive(client, invoice_lines):
    body = search(client, date_from="2026-02-10", date_to="2026-03-10")

    assert [row["invoice_date"] for row in body["items"]] == ["2026-03-10", "2026-02-10"]


def test_search_rejects_inverted_date_range(client):
    response = client.get("/search/invoice-lines", params={"date_from": "2026-03-01", "date_to": "2026-01-01"})

    assert response.status_code == 422


def test_search_sorts_by_requested_column(client, invoice_lines):
    body = search(client, sort_by="quantity", sort_direction="asc")

    assert [row["quantity"] for row in body["items"]] == [1, 2, 5]


def test_search_paginates(client, invoice_lines):
    body = search(client, page=2, page_size=2)

    assert body["total"] == 3
    assert body["page"] == 2
    assert len(body["items"]) == 1


def test_search_treats_wildcards_literally(client, invoice_lines):
    assert search(client, item_name="_")["total"] == 0
