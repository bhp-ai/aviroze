from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.db_models import User, UserRole, UserActivityType
from app.schemas.auth import Token, LoginRequest, RegisterRequest
from app.schemas.user import UserResponse
from app.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user
)
from app.logging_helper import log_user_activity

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    # Check if user already exists (only check active users for public registration)
    existing_user = db.query(User).filter(
        User.email == user_data.email,
        User.deleted_at.is_(None)  # Only check non-deleted users
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if there's a deleted account with this email
    deleted_user = db.query(User).filter(
        User.email == user_data.email,
        User.deleted_at.isnot(None)
    ).first()

    if deleted_user:
        # If admin deleted, don't allow self-registration
        if deleted_user.deletion_type == "admin":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email is associated with a deleted account. Please contact support@aviroze.com for assistance."
            )
        # If self-deleted, allow registration as fresh account (permanently delete old one)
        else:
            # Permanently delete the old self-deleted account to allow fresh start
            db.delete(deleted_user)
            db.commit()

    # Create new user
    hashed_password = get_password_hash(user_data.password)

    # Convert string role to enum
    user_role = UserRole.ADMIN if user_data.role.lower() == "admin" else UserRole.USER

    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password,
        role=user_role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Log user registration
    log_user_activity(
        db=db,
        activity_type=UserActivityType.REGISTER.value,
        user_id=new_user.id,
        description=f"User {new_user.username} registered",
        request=request
    )

    return new_user

@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Login and get access token"""
    # Find user by email (including soft-deleted users to provide specific error)
    user = db.query(User).filter(User.email == login_data.email).first()

    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user is soft-deleted (block login for both admin and self-deletion)
    if user.deleted_at is not None:
        if user.deletion_type == "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been deleted by admin. Please contact support@aviroze.com for assistance."
            )
        else:  # self-deleted
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been deleted. You can register again with the same email to create a new account."
            )

    # Check if user is active
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Create access token
    access_token = create_access_token(data={"sub": user.email})

    # Log user login
    log_user_activity(
        db=db,
        activity_type=UserActivityType.LOGIN.value,
        user_id=user.id,
        description=f"User {user.username} logged in",
        request=request
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_role": user.role
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current logged-in user information"""
    return current_user

@router.post("/change-password")
async def change_password(
    current_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    # Verify current password
    if not verify_password(current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Validate new password
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long"
        )

    # Update password
    current_user.password_hash = get_password_hash(new_password)
    db.commit()

    return {"message": "Password changed successfully"}
