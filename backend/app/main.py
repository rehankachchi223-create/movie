from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.api.routes import auth, users, movies, genres, recommendations, ratings, favorites, watchlist, history, health
from app.core.config import settings
from app.core.logging import logger
from app.database.database import SessionLocal, engine
from app.database.readiness import check_db_schema_readiness
from app.services.movie_data_service import MovieDataService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifespan handler."""
    logger.info("Initializing application startup tasks...")

    # Ensure database schema is initialized and all required tables exist
    is_ready, missing = check_db_schema_readiness(engine)
    if not is_ready:
        err_msg = (
            f"Database schema is not ready. Missing required tables: {missing}. "
            f"Please run 'alembic upgrade head' before starting the application."
        )
        logger.critical(err_msg)
        raise RuntimeError(err_msg)

    db = SessionLocal()
    try:
        data_service = MovieDataService(db)
        data_service.seed_initial_data_if_empty()
    except Exception as e:
        logger.error(f"Error during startup data seeding: {e}", exc_info=True)
    finally:
        db.close()

    yield
    logger.info("Application shutdown complete.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Production-Quality Real-World Movie Recommendation Platform Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS Configuration
allowed_origins = list(dict.fromkeys([
    *settings.CORS_ORIGINS,
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Centralized Exception Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error on {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Invalid request parameters or payload format.",
            "errors": exc.errors(),
        },
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database error on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "A database error occurred. Please try again later."},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred."},
    )


# Include Routers under /api/v1 AND /api for prompt compliance
v1_routers = [
    auth.router,
    users.router,
    movies.router,
    genres.router,
    recommendations.router,
    ratings.router,
    favorites.router,
    watchlist.router,
    history.router,
]

# Root Health Check
app.include_router(health.router)

# Mount routes under /api/v1
for r in v1_routers:
    app.include_router(r, prefix="/api/v1")

# Also mount routes under /api for unversioned endpoint compatibility
for r in v1_routers:
    app.include_router(r, prefix="/api")


@app.get("/", tags=["Root"])
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "docs": "/docs",
        "version": "1.0.0",
        "health": "/health",
    }
