import pytest
from fastapi import status


def test_list_movies(client):
    response = client.get("/api/v1/movies?page=1&limit=5")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "items" in data
    assert "meta" in data
    assert len(data["items"]) <= 5
    assert data["meta"]["total_items"] > 0


def test_search_movies(client):
    response = client.get("/api/v1/movies/search?q=Inception")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data["items"]) >= 1
    assert "Inception" in data["items"][0]["title"]


def test_get_movie_by_id(client):
    list_res = client.get("/api/v1/movies?limit=1")
    movie_id = list_res.json()["items"][0]["id"]

    response = client.get(f"/api/v1/movies/{movie_id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == movie_id
    assert "title" in data
    assert "genres" in data


def test_get_trending_and_popular(client):
    trending = client.get("/api/v1/movies/trending?limit=3")
    assert trending.status_code == status.HTTP_200_OK
    assert len(trending.json()) <= 3

    popular = client.get("/api/v1/movies/popular?limit=3")
    assert popular.status_code == status.HTTP_200_OK
    assert len(popular.json()) <= 3

    top_rated = client.get("/api/v1/movies/top-rated?limit=3")
    assert top_rated.status_code == status.HTTP_200_OK
    assert len(top_rated.json()) <= 3


def test_get_genres(client):
    response = client.get("/api/v1/genres")
    assert response.status_code == status.HTTP_200_OK
    genres = response.json()
    assert len(genres) > 0
    assert any(g["name"] == "Sci-Fi" for g in genres)
