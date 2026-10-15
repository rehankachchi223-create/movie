from fastapi import APIRouter, Depends
from app.api.deps import get_current_user
from app.database.models.user import User
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieve profile of the currently authenticated user."""
    return current_user
