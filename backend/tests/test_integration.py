import pytest
from fastapi import status


def test_complete_end_to_end_user_lifecycle_flow(client):
    """Verify complete real-world integration flow:

    Register → Login → Browse Movies → Search → Filter → Open Movie →
    Rate → Favorite → Add to Watchlist → Record Viewing History →
    Generate Personalized Recommendations → Retrieve Profile Data → Logout.
    """
    # 1. Register User
    reg_response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Integration User",
            "email": "integration.user@example.com",
            "password": "ProductionPassword123!",
        },
    )
    assert reg_response.status_code == status.HTTP_201_CREATED
    user_data = reg_response.json()
    assert user_data["email"] == "integration.user@example.com"

    # 2. Login User & Acquire JWT Access Token
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "integration.user@example.com",
            "password": "ProductionPassword123!",
        },
    )
    assert login_response.status_code == status.HTTP_200_OK
    token_data = login_response.json()
    assert "access_token" in token_data
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Browse Movies
    browse_response = client.get("/api/v1/movies?page=1&limit=10")
    assert browse_response.status_code == status.HTTP_200_OK
    browse_data = browse_response.json()
    assert browse_data["meta"]["total_items"] > 0

    # 4. Search Movies
    search_response = client.get("/api/v1/movies/search?q=Interstellar")
    assert search_response.status_code == status.HTTP_200_OK
    search_items = search_response.json()["items"]
    assert len(search_items) >= 1
    target_movie = search_items[0]
    movie_id = target_movie["id"]

    # 5. Filter Movies by Min Rating
    filter_response = client.get("/api/v1/movies?min_rating=8.0&sort_by=rating")
    assert filter_response.status_code == status.HTTP_200_OK
    filtered_items = filter_response.json()["items"]
    assert all(m["rating"] >= 8.0 for m in filtered_items)

    # 6. Open Movie Details
    detail_response = client.get(f"/api/v1/movies/{movie_id}")
    assert detail_response.status_code == status.HTTP_200_OK
    assert detail_response.json()["id"] == movie_id

    # 7. Rate Movie (9.0 out of 10)
    rate_response = client.post(
        "/api/v1/ratings",
        json={"movie_id": movie_id, "rating": 9.0},
        headers=headers,
    )
    assert rate_response.status_code == status.HTTP_201_CREATED
    assert rate_response.json()["rating"] == 9.0

    # 8. Add Movie to Favorites
    fav_response = client.post(f"/api/v1/favorites/{movie_id}", headers=headers)
    assert fav_response.status_code == status.HTTP_201_CREATED

    # Verify Favorite Status
    fav_status = client.get(f"/api/v1/favorites/{movie_id}/status", headers=headers)
    assert fav_status.json()["is_favorite"] is True

    # 9. Add Movie to Watchlist
    wl_response = client.post(f"/api/v1/watchlist/{movie_id}", headers=headers)
    assert wl_response.status_code == status.HTTP_201_CREATED

    # Verify Watchlist Status
    wl_status = client.get(f"/api/v1/watchlist/{movie_id}/status", headers=headers)
    assert wl_status.json()["in_watchlist"] is True

    # 10. Record Viewing History
    history_response = client.post(f"/api/v1/history/{movie_id}", headers=headers)
    assert history_response.status_code == status.HTTP_201_CREATED

    # Verify Viewing History List
    history_list = client.get("/api/v1/history", headers=headers)
    assert history_list.status_code == status.HTTP_200_OK
    assert len(history_list.json()) >= 1

    # 11. Generate Personalized Recommendations
    rec_response = client.get("/api/v1/recommendations?limit=5", headers=headers)
    assert rec_response.status_code == status.HTTP_200_OK
    rec_data = rec_response.json()
    assert rec_data["count"] > 0
    assert len(rec_data["items"]) <= 5
    # Ensure rated/favorited movie is not recommended back to user
    assert all(item["movie"]["id"] != movie_id for item in rec_data["items"])

    # 12. Retrieve Profile Data
    profile_response = client.get("/api/v1/users/me", headers=headers)
    assert profile_response.status_code == status.HTTP_200_OK
    assert profile_response.json()["email"] == "integration.user@example.com"

    # 13. Logout User
    logout_response = client.post("/api/v1/auth/logout", headers=headers)
    assert logout_response.status_code == status.HTTP_200_OK
    assert logout_response.json()["message"] == "Successfully logged out."
