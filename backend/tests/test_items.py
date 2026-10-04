from __future__ import annotations

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.item import Item


def test_create_item_in_leaf_category(client, api):
    category = api.category()

    response = client.post(
        "/items",
        json={"name": " Pen ", "price": "1.50", "cost": "0.40", "category_id": category["id"], "details": "  "},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Pen"
    assert body["price"] == "1.50"
    assert body["details"] is None


def test_item_cannot_be_assigned_to_parent_category(client, api):
    root = api.category("Root")
    api.category("Child", parent_id=root["id"])

    response = client.post("/items", json={"name": "Pen", "price": "1", "cost": "1", "category_id": root["id"]})

    assert response.status_code == 400
    assert "leaf categories" in response.json()["detail"]


def test_item_with_missing_category_returns_400(client):
    response = client.post("/items", json={"name": "Pen", "price": "1", "cost": "1", "category_id": 999999})

    assert response.status_code == 400
    assert response.json()["detail"] == "Category not found."


def test_item_rejects_negative_price(client, api):
    category = api.category()

    response = client.post("/items", json={"name": "Pen", "price": "-1", "cost": "1", "category_id": category["id"]})

    assert response.status_code == 422


def test_item_tags_reject_unknown_customer(client, api):
    category = api.category()

    response = client.post(
        "/items",
        json={"name": "Pen", "price": "1", "cost": "1", "category_id": category["id"], "tagged_customer_ids": [999999]},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Customer not found: 999999."


def test_item_tags_ignore_duplicate_ids(client, api):
    customer = api.customer()
    item = api.item(api.category()["id"], tagged_customer_ids=[customer["id"], customer["id"]])

    tags = client.get(f"/items/{item['id']}").json()["tagged_customers"]

    assert [tag["id"] for tag in tags] == [customer["id"]]


def test_item_detail_includes_category_path_tags_and_invoices(client, api):
    root = api.category("Stickers")
    leaf = api.category("Round", parent_id=root["id"])
    customer = api.customer("Ann")
    item = api.item(leaf["id"], tagged_customer_ids=[customer["id"]])
    invoice = api.invoice(customer["id"], [(item["id"], 3)])

    body = client.get(f"/items/{item['id']}").json()

    assert body["category_path"] == ["Stickers", "Round"]
    assert [tag["name"] for tag in body["tagged_customers"]] == ["Ann"]
    assert body["invoice_appearances"] == [
        {
            "invoice_id": invoice["id"],
            "invoice_number": invoice["invoice_number"],
            "invoice_date": "2026-01-15",
            "quantity": 3,
            "unit_price": "10.00",
            "line_total": "30.00",
        }
    ]


def test_update_item_replaces_tags(client, api):
    ann = api.customer("Ann")
    bob = api.customer("Bob")
    item = api.item(api.category()["id"], tagged_customer_ids=[ann["id"]])

    response = client.patch(f"/items/{item['id']}", json={"tagged_customer_ids": [bob["id"]]})

    assert response.status_code == 200
    tags = client.get(f"/items/{item['id']}").json()["tagged_customers"]
    assert [tag["name"] for tag in tags] == ["Bob"]


def test_update_item_into_parent_category_is_rejected(client, api):
    root = api.category("Root")
    leaf = api.category("Leaf", parent_id=root["id"])
    item = api.item(leaf["id"])

    response = client.patch(f"/items/{item['id']}", json={"category_id": root["id"]})

    assert response.status_code == 400


def test_list_items_filters_and_paginates(client, api):
    stickers = api.category("Stickers")
    banners = api.category("Banners")
    for name in ["Sticker A", "Sticker B", "Sticker C"]:
        api.item(stickers["id"], name=name)
    api.item(banners["id"], name="Banner A")

    by_category = client.get("/items", params={"category_id": stickers["id"], "page_size": 2}).json()
    by_search = client.get("/items", params={"search": "banner"}).json()

    assert by_category["total"] == 3
    assert [i["name"] for i in by_category["items"]] == ["Sticker A", "Sticker B"]
    assert [i["name"] for i in by_search["items"]] == ["Banner A"]


def test_get_missing_item_returns_404(client):
    assert client.get("/items/999999").status_code == 404


def test_delete_item(client, api):
    item = api.item(api.category()["id"])

    assert client.delete(f"/items/{item['id']}").status_code == 204
    assert client.get(f"/items/{item['id']}").status_code == 404


def test_delete_item_used_on_invoice_is_blocked(client, api):
    item = api.item(api.category()["id"])
    api.invoice(api.customer()["id"], [(item["id"], 1)])

    response = client.delete(f"/items/{item['id']}")

    assert response.status_code == 409
    assert "used in invoices" in response.json()["detail"]


def test_database_refuses_to_delete_item_used_on_invoice(db, api):
    item = api.item(api.category()["id"])
    api.invoice(api.customer()["id"], [(item["id"], 1)])

    db.delete(db.get(Item, item["id"]))
    with pytest.raises(IntegrityError):
        db.flush()
