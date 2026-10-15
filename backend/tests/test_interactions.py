import pytest
from fastapi import status


@pytest.fixture
def auth_headers(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "name": "User Interaction",
            "email": "interact@example.com",
            "password": "Password123!",
        },
    )
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "interact@example.com", "password": "Password123!"},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_rating_crud(client, auth_headers):
    # Fetch movie ID
    movies = client.get("/api/v1/movies?limit=1").json()["items"]
    movie_id = movies[0]["id"]

    # Post rating
    post_res = client.post(
        "/api/v1/ratings",
        json={"movie_id": movie_id, "rating": 9.5},
        headers=auth_headers,
    )
    assert post_res.status_code == status.HTTP_201_CREATED
    assert post_res.json()["rating"] == 9.5

    # Update rating
    put_res = client.put(
        f"/api/v1/ratings/{movie_id}",
        json={"rating": 8.0},
        headers=auth_headers,
    )
    assert put_res.status_code == status.HTTP_200_OK
    assert put_res.json()["rating"] == 8.0

    # Get my ratings
    my_ratings = client.get("/api/v1/ratings/me", headers=auth_headers)
    assert my_ratings.status_code == status.HTTP_200_OK
    assert len(my_ratings.json()) == 1

    # Delete rating
    del_res = client.delete(f"/api/v1/ratings/{movie_id}", headers=auth_headers)
    assert del_res.status_code == status.HTTP_200_OK


def test_favorites_and_watchlist(client, auth_headers):
    movies = client.get("/api/v1/movies?limit=1").json()["items"]
    movie_id = movies[0]["id"]

    # Add Favorite
    fav_res = client.post(f"/api/v1/favorites/{movie_id}", headers=auth_headers)
    assert fav_res.status_code == status.HTTP_201_CREATED

    # Check status
    fav_status = client.get(f"/api/v1/favorites/{movie_id}/status", headers=auth_headers)
    assert fav_status.json()["is_favorite"] is True

    # Add Watchlist
    wl_res = client.post(f"/api/v1/watchlist/{movie_id}", headers=auth_headers)
    assert wl_res.status_code == status.HTTP_201_CREATED

    # Check status
    wl_status = client.get(f"/api/v1/watchlist/{movie_id}/status", headers=auth_headers)
    assert wl_status.json()["in_watchlist"] is True

    # Remove
    client.delete(f"/api/v1/favorites/{movie_id}", headers=auth_headers)
    client.delete(f"/api/v1/watchlist/{movie_id}", headers=auth_headers)


def test_viewing_history(client, auth_headers):
    movies = client.get("/api/v1/movies?limit=1").json()["items"]
    movie_id = movies[0]["id"]

    # Record history
    rec_res = client.post(f"/api/v1/history/{movie_id}", headers=auth_headers)
    assert rec_res.status_code == status.HTTP_201_CREATED

    # Get history
    get_res = client.get("/api/v1/history", headers=auth_headers)
    assert get_res.status_code == status.HTTP_200_OK
    assert len(get_res.json()) >= 1
