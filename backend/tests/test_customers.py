from __future__ import annotations

from sqlalchemy import func, select

from app.models.item import item_customer_tags


def test_create_customer_trims_and_returns_fields(client):
    response = client.post(
        "/customers",
        json={"name": "  Ann  ", "email": " ann@example.com ", "phone": "+1 555 123 4567"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Ann"
    assert body["email"] == "ann@example.com"
    assert body["phone"] == "+1 555 123 4567"


def test_create_customer_rejects_invalid_email(client):
    response = client.post("/customers", json={"name": "Ann", "email": "not-an-email"})

    assert response.status_code == 422


def test_create_customer_rejects_blank_name(client):
    response = client.post("/customers", json={"name": "   "})

    assert response.status_code == 422


def test_list_customers_is_sorted_and_paginated(client, api):
    for name in ["Carl", "Ann", "Bea"]:
        api.customer(name)

    first_page = client.get("/customers", params={"page_size": 2}).json()
    second_page = client.get("/customers", params={"page_size": 2, "page": 2}).json()

    assert first_page["total"] == 3
    assert [c["name"] for c in first_page["items"]] == ["Ann", "Bea"]
    assert [c["name"] for c in second_page["items"]] == ["Carl"]
    assert second_page["page"] == 2


def test_list_customers_search_is_case_insensitive_substring(client, api):
    api.customer("Annabel")
    api.customer("Joanna")
    api.customer("Bob")

    body = client.get("/customers", params={"search": "ANN"}).json()

    assert sorted(c["name"] for c in body["items"]) == ["Annabel", "Joanna"]
    assert body["total"] == 2


def test_list_customers_search_treats_wildcards_literally(client, api):
    api.customer("100% Cotton Co")
    api.customer("Plain Co")

    body = client.get("/customers", params={"search": "%"}).json()

    assert [c["name"] for c in body["items"]] == ["100% Cotton Co"]


def test_list_customers_rejects_out_of_range_paging(client):
    assert client.get("/customers", params={"page": 0}).status_code == 422
    assert client.get("/customers", params={"page_size": 101}).status_code == 422


def test_get_customer_includes_invoices_and_tagged_items(client, api):
    customer = api.customer("Ann")
    category = api.category()
    item = api.item(category["id"], tagged_customer_ids=[customer["id"]])
    invoice = api.invoice(customer["id"], [(item["id"], 1)])

    body = client.get(f"/customers/{customer['id']}").json()

    assert [i["invoice_number"] for i in body["invoices"]] == [invoice["invoice_number"]]
    assert [i["name"] for i in body["tagged_items"]] == ["Pen"]


def test_get_missing_customer_returns_404(client):
    response = client.get("/customers/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Customer not found."


def test_update_customer_changes_only_sent_fields(client, api):
    customer = api.customer("Ann", email="ann@example.com")

    response = client.patch(f"/customers/{customer['id']}", json={"name": "Ann Lee"})

    assert response.status_code == 200
    assert response.json()["name"] == "Ann Lee"
    assert response.json()["email"] == "ann@example.com"


def test_update_missing_customer_returns_404(client):
    assert client.patch("/customers/999999", json={"name": "X"}).status_code == 404


def test_delete_customer(client, api):
    customer = api.customer()

    assert client.delete(f"/customers/{customer['id']}").status_code == 204
    assert client.get(f"/customers/{customer['id']}").status_code == 404


def test_delete_customer_with_invoices_is_blocked(client, api):
    customer = api.customer()
    item = api.item(api.category()["id"])
    api.invoice(customer["id"], [(item["id"], 1)])

    response = client.delete(f"/customers/{customer['id']}")

    assert response.status_code == 409
    assert "referenced by invoices" in response.json()["detail"]


def test_delete_tagged_customer_removes_only_their_tags(client, api, db):
    ann = api.customer("Ann")
    bob = api.customer("Bob")
    item = api.item(api.category()["id"], tagged_customer_ids=[ann["id"], bob["id"]])

    assert client.delete(f"/customers/{ann['id']}").status_code == 204

    remaining_tags = client.get(f"/items/{item['id']}").json()["tagged_customers"]
    assert [tag["name"] for tag in remaining_tags] == ["Bob"]
    orphan_tags = db.scalar(
        select(func.count()).select_from(item_customer_tags).where(item_customer_tags.c.customer_id == ann["id"])
    )
    assert orphan_tags == 0
