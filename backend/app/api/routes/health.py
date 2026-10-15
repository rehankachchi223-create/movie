from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.database.database import get_db
from app.database.readiness import check_db_schema_readiness
from app.schemas.common import HealthCheckResponse

router = APIRouter(tags=["Health Check"])


@router.get("/health", response_model=HealthCheckResponse)
def health_check(response: Response, db: Session = Depends(get_db)):
    """Check service health, database connectivity, and schema readiness without disclosing raw errors."""
    try:
        db.execute(text("SELECT 1"))
        is_ready, missing = check_db_schema_readiness(db.get_bind())
        if not is_ready:
            logger.error("Health check failed: missing required database tables: %s", missing)
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
            return HealthCheckResponse(
                status="unhealthy",
                environment=settings.ENVIRONMENT,
                database="unhealthy",
                version="1.0.0",
            )

        return HealthCheckResponse(
            status="healthy",
            environment=settings.ENVIRONMENT,
            database="connected",
            version="1.0.0",
        )
    except Exception as e:
        logger.error("Health check failed: database connectivity error: %s", e)
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return HealthCheckResponse(
            status="unhealthy",
            environment=settings.ENVIRONMENT,
            database="disconnected",
            version="1.0.0",
        )
