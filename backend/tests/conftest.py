import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# Append backend directory to sys.path
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.database import Base, get_db
from app.main import app
from app.services.movie_data_service import MovieDataService

TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///./test_movierec.db"

engine = create_engine(
    TEST_SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Create all database tables and seed initial movie data before running test suite."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        data_service = MovieDataService(db)
        data_service.seed_initial_data_if_empty()
    finally:
        db.close()

    yield

    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_movierec.db"):
        try:
            os.remove("./test_movierec.db")
        except OSError:
            pass


@pytest.fixture(scope="function")
def db_session():
    """Provide transactional database session for each test function."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Provide FastAPI TestClient configured to override get_db dependency."""
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
