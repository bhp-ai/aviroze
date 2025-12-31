from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.db_models import User, DeletionType
from app.schemas.user import UserResponse, UserUpdate, UserCreate
from app.auth import get_current_admin_user, get_current_user, get_password_hash
from app.services.email_service import email_service

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("/", response_model=List[UserResponse])
async def get_users(
    role: Optional[str] = Query(None, description="Filter by role (admin/user)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by username or email"),
    include_deleted: bool = Query(False, description="Include soft-deleted users"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users (Admin only)"""
    query = db.query(User)

    # Exclude soft-deleted users by default
    if not include_deleted:
        query = query.filter(User.deleted_at.is_(None))

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
    user = db.query(User).filter(
        User.id == user_id,
        User.deleted_at.is_(None)  # Exclude soft-deleted users
    ).first()
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
    """Create a new user (Admin only) - For fresh accounts only"""
    # Check if active user already exists
    existing_user = db.query(User).filter(
        User.email == user_data.email,
        User.deleted_at.is_(None)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered with an active account"
        )

    # Check if there's a deleted account with this email
    deleted_user = db.query(User).filter(
        User.email == user_data.email,
        User.deleted_at.isnot(None)
    ).first()

    if deleted_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email belongs to a deleted account. Please go to the 'Deleted Accounts' tab and use the restore function instead."
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

    # Send welcome email to new user
    try:
        email_service.send_welcome_email(
            user_data={"username": new_user.username, "email": new_user.email}
        )
    except Exception as e:
        print(f"Failed to send welcome email: {str(e)}")

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
    """Soft delete a user (Admin only) - User data and history are preserved"""
    user = db.query(User).filter(
        User.id == user_id,
        User.deleted_at.is_(None)  # Only allow deleting non-deleted users
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or already deleted"
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

    # Soft delete by admin: set deleted_at timestamp, deletion type, and status
    user.deleted_at = datetime.utcnow()
    user.deletion_type = DeletionType.ADMIN
    user.deleted_by = current_user.id
    user.status = "inactive"  # Mark as inactive when deleted
    db.commit()

    # Send email notification
    try:
        email_service.send_account_deletion_email(
            user_data={"username": user.username, "email": user.email},
            deletion_type="admin"
        )
    except Exception as e:
        print(f"Failed to send deletion email: {str(e)}")

    return None

@router.post("/{user_id}/restore", response_model=UserResponse)
async def restore_user(
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Restore a soft-deleted user (Admin only)"""
    user = db.query(User).filter(
        User.id == user_id,
        User.deleted_at.isnot(None)  # Only allow restoring deleted users
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deleted user not found"
        )

    # Restore user: clear deleted_at timestamp and deletion info, set status to active
    user.deleted_at = None
    user.deletion_type = None
    user.deleted_by = None
    user.status = "active"  # Restore to active status
    db.commit()
    db.refresh(user)

    # Send account restored email
    try:
        email_service.send_account_restore_email(
            user_data={"username": user.username, "email": user.email}
        )
    except Exception as e:
        print(f"Failed to send restore email: {str(e)}")

    return user

@router.post("/me/delete", response_model=UserResponse)
async def self_delete_account(
    consent: bool = Query(..., description="User must consent to deletion"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Self-delete account - User marks their own account for deletion (can still login)"""
    if not consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must provide consent to delete your account"
        )

    # Check if already deleted
    if current_user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is already marked for deletion"
        )

    # Protect default hardcoded users
    if current_user.email in ["admin@admin.com", "user@user.com"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete default system users"
        )

    # Mark account for deletion (self-deletion)
    current_user.deleted_at = datetime.utcnow()
    current_user.deletion_type = DeletionType.SELF
    current_user.deleted_by = current_user.id
    current_user.status = "inactive"  # Set to inactive - user cannot login anymore
    db.commit()
    db.refresh(current_user)

    # Send email notification
    try:
        email_service.send_account_deletion_email(
            user_data={"username": current_user.username, "email": current_user.email},
            deletion_type="self"
        )
    except Exception as e:
        print(f"Failed to send deletion email: {str(e)}")

    return current_user

@router.delete("/{user_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
async def permanently_delete_user(
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Permanently delete a user - This action cannot be undone! (Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent permanently deleting yourself
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot permanently delete your own account"
        )

    # Protect default hardcoded users from permanent deletion
    if user.email in ["admin@admin.com", "user@user.com"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot permanently delete default system users (admin@admin.com and user@user.com)"
        )

    # Permanently delete from database
    db.delete(user)
    db.commit()
    return None
