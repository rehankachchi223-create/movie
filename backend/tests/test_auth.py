import pytest
from fastapi import status


def test_user_registration(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Alice Tester",
            "email": "alice@example.com",
            "password": "Password123!",
        },
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == "alice@example.com"
    assert data["name"] == "Alice Tester"
    assert "id" in data
    assert "password_hash" not in data


def test_duplicate_user_registration(client):
    # Register once
    client.post(
        "/api/v1/auth/register",
        json={
            "name": "Bob Duplicate",
            "email": "bob@example.com",
            "password": "Password123!",
        },
    )
    # Register duplicate
    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Bob Duplicate",
            "email": "bob@example.com",
            "password": "DifferentPassword123!",
        },
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already exists" in response.json()["detail"]


def test_user_login_success(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "name": "Charlie Login",
            "email": "charlie@example.com",
            "password": "Password123!",
        },
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "charlie@example.com", "password": "Password123!"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_user_login_invalid_password(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "name": "Dave Wrong",
            "email": "dave@example.com",
            "password": "Password123!",
        },
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "dave@example.com", "password": "WrongPassword!"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_current_user_profile(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "name": "Eve Profile",
            "email": "eve@example.com",
            "password": "Password123!",
        },
    )
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "eve@example.com", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]

    response = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["email"] == "eve@example.com"
