import pytest
from fastapi import status


def test_content_based_similar_movies(client):
    movies = client.get("/api/v1/movies?limit=2").json()["items"]
    movie_id = movies[0]["id"]

    response = client.get(f"/api/v1/movies/{movie_id}/similar?limit=5")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "items" in data
    assert data["recommendation_type"] == "similar_movies"
    assert data["strategy_used"] == "content_based_tfidf"
    assert len(data["items"]) <= 5
    # Ensure target movie is excluded from recommendations
    assert all(item["movie"]["id"] != movie_id for item in data["items"])


def test_cold_start_recommendations_unauthenticated(client):
    response = client.get("/api/v1/recommendations?limit=5")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "items" in data
    assert data["recommendation_type"] == "cold_start_popular"
    assert len(data["items"]) <= 5


def test_personalized_hybrid_recommendations(client):
    # 1. Register & login
    client.post(
        "/api/v1/auth/register",
        json={
            "name": "Rec User",
            "email": "recuser@example.com",
            "password": "Password123!",
        },
    )
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "recuser@example.com", "password": "Password123!"},
    )
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Find Sci-Fi movie (e.g. Inception or Interstellar) and favorite/rate it
    scifi_res = client.get("/api/v1/movies/search?q=Inception").json()["items"]
    if scifi_res:
        movie_id = scifi_res[0]["id"]
        # Add to favorites and rate 9.5
        client.post(f"/api/v1/favorites/{movie_id}", headers=headers)
        client.post("/api/v1/ratings", json={"movie_id": movie_id, "rating": 9.5}, headers=headers)

    # 3. Request personalized recommendations
    rec_res = client.get("/api/v1/recommendations?limit=5", headers=headers)
    assert rec_res.status_code == status.HTTP_200_OK
    data = rec_res.json()
    assert "items" in data
    assert len(data["items"]) > 0
    # Confirm strategy used is personalized
    assert data["strategy_used"] in ["personalized_user_hybrid", "cold_start_popular"]
