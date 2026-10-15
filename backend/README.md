# Production-Quality Movie Recommendation Platform Backend

A modular, secure, maintainable, and testable real-world Movie Recommendation Platform backend built with **Python**, **FastAPI**, **SQLAlchemy**, **Alembic**, **PostgreSQL**, **Pydantic v2**, **scikit-learn**, **pandas**, and **pytest**.

---

## Architecture Overview

The system follows a strict layered architecture to ensure separation of concerns and maintainability:

```
API Routes Controller  (app/api/routes/)
        │
        ▼
Business Logic Services (app/services/)
        │
        ▼
Data Access Repositories (app/repositories/)
        │
        ▼
SQLAlchemy ORM Models   (app/database/models/)
        │
        ▼
Database (PostgreSQL / SQLite)
```

Recommendation engine logic is isolated inside `recommendation/` with a pluggable strategy interface (`BaseRecommenderStrategy`). This allows adding new recommendation algorithms (e.g. Collaborative Filtering, Matrix Factorization, Deep Learning / ML Ranking) without mutating API routes or repository interfaces.

---

## Technology Stack

- **Framework**: Python 3.10+ & FastAPI
- **Database ORM**: SQLAlchemy 2.0 (Declarative Mapped Types)
- **Migrations**: Alembic
- **Database Engine**: PostgreSQL (Production) / SQLite (Out-of-the-box local development & testing fallback)
- **Security & Auth**: PyJWT (HS256 tokens) & Bcrypt password hashing (`pwdlib`)
- **Validation**: Pydantic v2 & `pydantic-settings`
- **Machine Learning / Vectorization**: scikit-learn (`TfidfVectorizer`, `cosine_similarity`), NumPy, pandas
- **Testing**: pytest & HTTPX `TestClient`

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                     # FastAPI application factory, CORS, exception handlers
│   ├── core/                       # App settings, security, logging
│   │   ├── config.py
│   │   ├── security.py
│   │   └── logging.py
│   ├── database/                   # Session maker & ORM models
│   │   ├── database.py
│   │   └── models/
│   │       ├── user.py
│   │       ├── movie.py
│   │       ├── genre.py
│   │       ├── movie_genre.py
│   │       ├── rating.py
│   │       ├── favorite.py
│   │       ├── watchlist.py
│   │       └── history.py
│   ├── schemas/                    # Pydantic validation schemas
│   ├── repositories/               # Data access repositories (CRUD)
│   ├── services/                   # Business logic services
│   └── api/                        # API route controllers & dependencies
│       ├── deps.py
│       └── routes/
├── recommendation/                 # Recommendation Engine
│   ├── base.py                     # BaseRecommenderStrategy interface
│   ├── content_based.py            # TF-IDF + Cosine Similarity model
│   ├── cold_start.py               # Popularity & top-rated fallback
│   ├── personalized.py             # User history & explicit signal hybrid engine
│   └── cache.py                    # Vector matrix cache
├── migrations/                     # Alembic database migrations
├── tests/                          # Automated test suite & end-to-end integration test
├── requirements.txt
├── .env.example
├── .env
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Installation & Setup

### 1. Environment & Dependencies

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and replace the sample values with your own secret values:

```bash
cp .env.example .env
```

Parameters in `.env`:

```env
DATABASE_URL=sqlite:///./movierec.db  # Or postgresql+psycopg2://postgres:postgres@localhost:5432/movierec
SECRET_KEY=change-this-to-a-long-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
EXTERNAL_MOVIE_API_KEY=
PROJECT_NAME=Movie Recommendation Platform
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

Important: never commit real secrets to source control. Use a local `.env` file, environment variables, or a secret manager in production.

The bundled local seed contains a small starter catalog for development. For a realistic catalog with broad year and genre coverage, add a TMDB API key:

```env
TMDB_API_KEY=your-tmdb-api-key
```

Restart the backend after adding the key. Startup will automatically import movies when the catalog is below the configured minimum. You can also run an explicit import from the `backend` directory:

```bash
python -m app.utils.tmdb_importer --max-pages 10 --max-movies 500 --start-year 1900 --end-year 2026
```

Without an external API key, an empty result for a narrow combination such as `Crime` plus `2000` means that no bundled movie matches those exact filters. Use **Browse all movies** in Discover or configure the catalog import above.

### 3. PostgreSQL Database Setup (Optional for local dev, Required for Production)

Create database in PostgreSQL:

```sql
CREATE DATABASE movierec;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE movierec TO postgres;
```

Update `DATABASE_URL` in `.env`:
`postgresql+psycopg2://postgres:postgres@localhost:5432/movierec`

### 4. Database Migrations (Alembic)

To generate and run Alembic migrations:

```bash
# Generate migration
alembic revision --autogenerate -m "Initial schema"

# Upgrade database to head
alembic upgrade head
```

---

## Running the Application

Start the FastAPI development server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Upon initial startup, the backend automatically seeds a dataset of top popular movies across multiple genres into the database.

---

## API Documentation

FastAPI provides interactive OpenAPI documentation automatically:

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Endpoint Summary

#### Authentication
- `POST /api/v1/auth/register` — Register a new account
- `POST /api/v1/auth/login` — Login and receive JWT token
- `POST /api/v1/auth/logout` — Logout user
- `GET /api/v1/users/me` — Get authenticated user profile

#### Movies & Search
- `GET /api/v1/movies` — List movies (filters: search, genre_id, year, min_rating, sort_by, pagination)
- `GET /api/v1/movies/{id}` — Get movie details
- `GET /api/v1/movies/search?q={query}` — Search movies
- `GET /api/v1/movies/trending` — Get trending movies
- `GET /api/v1/movies/popular` — Get popular movies
- `GET /api/v1/movies/top-rated` — Get top rated movies
- `GET /api/v1/genres` — Get all genres
- `GET /api/v1/movies/{id}/similar` — Get content-based similar movies

#### Recommendations
- `GET /api/v1/recommendations` — Get personalized hybrid recommendations (or cold-start popular for guests)

#### User Interactions
- `POST /api/v1/ratings` | `PUT /api/v1/ratings/{movie_id}` | `DELETE /api/v1/ratings/{movie_id}` | `GET /api/v1/ratings/me`
- `POST /api/v1/favorites/{movie_id}` | `DELETE /api/v1/favorites/{movie_id}` | `GET /api/v1/favorites` | `GET /api/v1/favorites/{movie_id}/status`
- `POST /api/v1/watchlist/{movie_id}` | `DELETE /api/v1/watchlist/{movie_id}` | `GET /api/v1/watchlist` | `GET /api/v1/watchlist/{movie_id}/status`
- `POST /api/v1/history/{movie_id}` | `GET /api/v1/history` | `DELETE /api/v1/history/{movie_id}`

#### System Health
- `GET /health` — Service status check

---

## Recommendation Engine Design

1. **Content-Based Filtering**: Combines movie metadata (`title`, `genres`, `overview`, `tagline`, `director`, `cast_list`, `keywords`) into document representations. Generates TF-IDF vectors and pairwise Cosine Similarity matrix. Excludes the target movie and ranks candidates by similarity.
2. **Cold-Start Fallback**: Returns top-rated and popular movies when a user has no interaction signals.
3. **Personalized Hybrid Engine**: Builds a user preference profile vector by weighting user interactions:
   - **Favorites**: +3.0 weight
   - **Ratings >= 6.0**: +(rating - 5.0)/2.0 weight
   - **Watchlist**: +1.5 weight
   - **Viewing History**: +1.0 weight
   Scores all unseen movies via cosine similarity against the user preference vector, returning similarity scores and context explanations.

---

## Automated Testing Suite

Run pytest to execute all unit tests and the end-to-end integration lifecycle test:

```bash
pytest -v
```

The test suite covers:
- User registration, login, profile retrieval, duplicate email protection, invalid credentials.
- Movie browsing, search, genre/year/rating filters, pagination, detail endpoint.
- User ratings CRUD, average rating recalculation, favorites, watchlist, viewing history.
- Similar movie recommendations, cold-start fallback, personalized hybrid recommendations.
- **End-to-End User Lifecycle Integration Flow** (`tests/test_integration.py`).

---

## Deployment & Docker Containerization

Run with Docker Compose:

```bash
docker-compose up --build
```

This starts PostgreSQL 15 on port 5432 and the FastAPI backend service on port 8000.

---

## Frontend Integration Guide

1. Configure React frontend API base URL: `http://localhost:8000/api/v1`
2. Include the JWT access token in HTTP request headers:
   `Authorization: Bearer <access_token>`
3. Handle standard HTTP error responses:
   - `401 Unauthorized` -> Redirect to Login screen
   - `422 Unprocessable Entity` -> Show input field validation errors
   - `400 Bad Request` -> Show user notification

---

## TMDB Movie Catalog Expansion

The project now includes a scalable TMDB-backed importer for expanding the movie catalog beyond the small built-in seed dataset.

1. Create a TMDB API key at https://www.themoviedb.org/settings/api
2. Add it to your local `.env`:

```env
EXTERNAL_MOVIE_API_KEY=your_tmdb_api_key_here
TMDB_API_KEY=your_tmdb_api_key_here
MOVIE_IMPORT_PAGE_LIMIT=10
MOVIE_IMPORT_MAX_MOVIES=500
MOVIE_IMPORT_MINIMUM_COUNT=200
MOVIE_IMPORT_START_YEAR=1900
MOVIE_IMPORT_END_YEAR=2026
```

3. Run the importer:

```bash
python -m app.utils.tmdb_importer --max-pages 20 --max-movies 2000 --start-year 1900 --end-year 2026
```

The importer is idempotent and checks for duplicates using TMDB external IDs and a title+release-date fallback. It also skips incomplete or invalid records without stopping the overall import.

When the API key is missing, the application safely warns and continues without importing external data.
