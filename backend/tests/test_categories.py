from __future__ import annotations

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.category import Category


def test_create_root_and_child_category(client, api):
    root = api.category("Stickers")

    response = client.post("/categories", json={"name": "Round", "parent_id": root["id"]})

    assert response.status_code == 201
    assert response.json()["parent_id"] == root["id"]


def test_create_category_with_missing_parent_returns_400(client):
    response = client.post("/categories", json={"name": "Round", "parent_id": 999999})

    assert response.status_code == 400
    assert response.json()["detail"] == "Parent category not found."


def test_category_cannot_be_its_own_parent(client, api):
    category = api.category()

    response = client.patch(f"/categories/{category['id']}", json={"parent_id": category["id"]})

    assert response.status_code == 400
    assert "own parent" in response.json()["detail"]


def test_moving_category_under_its_descendant_is_rejected(client, api):
    root = api.category("Root")
    child = api.category("Child", parent_id=root["id"])
    grandchild = api.category("Grandchild", parent_id=child["id"])

    response = client.patch(f"/categories/{root['id']}", json={"parent_id": grandchild["id"]})

    assert response.status_code == 400
    assert "cycle" in response.json()["detail"]


def test_tree_nests_children_sorted_and_marks_leaves(client, api):
    root = api.category("Stickers")
    api.category("Square", parent_id=root["id"])
    api.category("Round", parent_id=root["id"])
    api.category("Banners")

    tree = client.get("/categories/tree").json()

    assert [node["name"] for node in tree] == ["Banners", "Stickers"]
    stickers = tree[1]
    assert stickers["is_leaf"] is False
    assert [child["name"] for child in stickers["children"]] == ["Round", "Square"]
    assert all(child["is_leaf"] for child in stickers["children"])


def test_category_detail_includes_path_and_parent(client, api):
    root = api.category("Stickers")
    child = api.category("Round", parent_id=root["id"])
    leaf = api.category("20x20", parent_id=child["id"])

    body = client.get(f"/categories/{leaf['id']}").json()

    assert body["path"] == ["Stickers", "Round", "20x20"]
    assert body["parent"] == {"id": child["id"], "name": "Round"}
    assert body["is_leaf"] is True


def test_list_categories_search(client, api):
    api.category("Stickers")
    api.category("Banners")

    body = client.get("/categories", params={"search": "stick"}).json()

    assert [c["name"] for c in body] == ["Stickers"]


def test_get_missing_category_returns_404(client):
    assert client.get("/categories/999999").status_code == 404


def test_delete_leaf_category(client, api):
    category = api.category()

    assert client.delete(f"/categories/{category['id']}").status_code == 204
    assert client.get(f"/categories/{category['id']}").status_code == 404


def test_delete_category_with_children_is_blocked(client, api):
    root = api.category("Root")
    api.category("Child", parent_id=root["id"])

    response = client.delete(f"/categories/{root['id']}")

    assert response.status_code == 409
    assert "child categories" in response.json()["detail"]


def test_delete_category_with_items_is_blocked(client, api):
    category = api.category()
    api.item(category["id"])

    response = client.delete(f"/categories/{category['id']}")

    assert response.status_code == 409
    assert "assigned to items" in response.json()["detail"]


def test_database_refuses_to_delete_category_with_children(db, api):
    root = api.category("Root")
    api.category("Child", parent_id=root["id"])

    category = db.get(Category, root["id"])
    db.delete(category)
    with pytest.raises(IntegrityError):
        db.flush()
