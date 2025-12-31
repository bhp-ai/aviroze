from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.db_models import Address, User
from app.schemas.address import AddressCreate, AddressUpdate, AddressResponse
from app.auth import get_current_user
from app.services.stripe_service import stripe_service

router = APIRouter(prefix="/api/addresses", tags=["Addresses"])

@router.get("/", response_model=List[AddressResponse])
async def get_user_addresses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all addresses for the current user"""
    addresses = db.query(Address).filter(
        Address.user_id == current_user.id
    ).order_by(Address.is_default.desc(), Address.created_at.desc()).all()

    return addresses

@router.get("/{address_id}", response_model=AddressResponse)
async def get_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single address by ID"""
    address = db.query(Address).filter(
        Address.id == address_id,
        Address.user_id == current_user.id
    ).first()

    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )

    return address

@router.post("/", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
async def create_address(
    address_data: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new address"""
    # If this is set as default, unset other defaults
    if address_data.is_default:
        db.query(Address).filter(
            Address.user_id == current_user.id,
            Address.is_default == True
        ).update({"is_default": False})

    new_address = Address(
        user_id=current_user.id,
        **address_data.model_dump()
    )

    db.add(new_address)
    db.commit()
    db.refresh(new_address)

    # If this is the default address, sync with Stripe Customer
    if new_address.is_default:
        try:
            stripe_service.create_or_update_customer(current_user, new_address, db)
            print(f"[Address] Synced new default address to Stripe for user {current_user.email}")
        except Exception as e:
            print(f"[Address] Failed to sync address to Stripe: {str(e)}")
            # Don't fail the address creation if Stripe sync fails

    return new_address

@router.put("/{address_id}", response_model=AddressResponse)
async def update_address(
    address_id: int,
    address_data: AddressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an address"""
    address = db.query(Address).filter(
        Address.id == address_id,
        Address.user_id == current_user.id
    ).first()

    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )

    # If this is set as default, unset other defaults
    if address_data.is_default:
        db.query(Address).filter(
            Address.user_id == current_user.id,
            Address.is_default == True,
            Address.id != address_id
        ).update({"is_default": False})

    # Update fields
    update_data = address_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(address, field, value)

    db.commit()
    db.refresh(address)

    # If this is the default address, sync with Stripe Customer
    if address.is_default:
        try:
            stripe_service.create_or_update_customer(current_user, address, db)
            print(f"[Address] Synced updated default address to Stripe for user {current_user.email}")
        except Exception as e:
            print(f"[Address] Failed to sync address to Stripe: {str(e)}")
            # Don't fail the address update if Stripe sync fails

    return address

@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an address"""
    address = db.query(Address).filter(
        Address.id == address_id,
        Address.user_id == current_user.id
    ).first()

    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )

    db.delete(address)
    db.commit()

    return None

@router.post("/{address_id}/set-default", response_model=AddressResponse)
async def set_default_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set an address as default"""
    address = db.query(Address).filter(
        Address.id == address_id,
        Address.user_id == current_user.id
    ).first()

    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )

    # Unset other defaults
    db.query(Address).filter(
        Address.user_id == current_user.id,
        Address.is_default == True
    ).update({"is_default": False})

    # Set this as default
    address.is_default = True
    db.commit()
    db.refresh(address)

    # Sync the new default address with Stripe Customer
    try:
        stripe_service.create_or_update_customer(current_user, address, db)
        print(f"[Address] Synced new default address to Stripe for user {current_user.email}")
    except Exception as e:
        print(f"[Address] Failed to sync address to Stripe: {str(e)}")
        # Don't fail the operation if Stripe sync fails

    return address
