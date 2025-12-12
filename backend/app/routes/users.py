from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.db_models import User
from app.schemas.user import UserResponse, UserUpdate, UserCreate
from app.auth import get_current_admin_user, get_password_hash

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("/", response_model=List[UserResponse])
async def get_users(
    role: Optional[str] = Query(None, description="Filter by role (admin/user)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by username or email"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users (Admin only)"""
    query = db.query(User)

    if role:
        query = query.filter(User.role == role)

    if status_filter:
        query = query.filter(User.status == status_filter)

    if search:
        query = query.filter(
            (User.username.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )

    users = query.offset(skip).limit(limit).all()
    return users

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get a single user by ID (Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new user (Admin only)"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password,
        role=user_data.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update a user (Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Protect default hardcoded users from modification
    if user.email in ["admin@admin.com", "user@user.com"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify default system users (admin@admin.com and user@user.com)"
        )

    # Only system admin (admin@admin.com) can change roles
    if user_data.role is not None and current_user.email != "admin@admin.com":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the system administrator can change user roles"
        )

    # Update fields
    if user_data.username is not None:
        user.username = user_data.username
    if user_data.email is not None:
        # Check if email is already taken
        existing_user = db.query(User).filter(
            User.email == user_data.email,
            User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already taken"
            )
        user.email = user_data.email
    if user_data.role is not None:
        user.role = user_data.role
    if user_data.status is not None:
        user.status = user_data.status

    db.commit()
    db.refresh(user)

    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a user (Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent deleting yourself
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    # Protect default hardcoded users from deletion
    if user.email in ["admin@admin.com", "user@user.com"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete default system users (admin@admin.com and user@user.com)"
        )

    db.delete(user)
    db.commit()
    return None
