from typing import Generic, List, Optional, Type, TypeVar
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.database.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Generic Base Repository providing common CRUD database operations."""

    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db

    def get_by_id(self, id: int) -> Optional[ModelType]:
        """Fetch a record by primary key integer ID."""
        return self.db.get(self.model, id)

    def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """Fetch all records with optional pagination."""
        stmt = select(self.model).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count(self) -> int:
        """Count total records for the model."""
        stmt = select(func.count()).select_from(self.model)
        return self.db.scalar(stmt) or 0

    def create(self, obj_in: ModelType) -> ModelType:
        """Create and commit a new model instance."""
        self.db.add(obj_in)
        self.db.commit()
        self.db.refresh(obj_in)
        return obj_in

    def delete(self, obj: ModelType) -> None:
        """Delete an existing model instance."""
        self.db.delete(obj)
        self.db.commit()
