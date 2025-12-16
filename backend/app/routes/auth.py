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
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

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
    # Find user by email
    user = db.query(User).filter(User.email == login_data.email).first()

    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
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
