from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.db_models import Collection
from app.auth import get_current_admin_user
import base64

router = APIRouter(prefix="/api/collections", tags=["Collections"])

# Pydantic response models
from pydantic import BaseModel

class CollectionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    image_url: Optional[str]
    created_at: str

    class Config:
        from_attributes = True

@router.get("/", response_model=List[CollectionResponse])
async def get_all_collections(db: Session = Depends(get_db)):
    """Get all collections"""
    collections = db.query(Collection).all()

    result = []
    for collection in collections:
        # Convert image to base64 data URL if exists
        image_url = None
        if collection.image:
            base64_image = base64.b64encode(collection.image).decode('utf-8')
            image_url = f"data:{collection.image_mimetype or 'image/jpeg'};base64,{base64_image}"

        result.append({
            "id": collection.id,
            "name": collection.name,
            "description": collection.description,
            "image_url": image_url,
            "created_at": collection.created_at.isoformat() if collection.created_at else None
        })

    return result

@router.get("/{collection_id}", response_model=CollectionResponse)
async def get_collection(collection_id: int, db: Session = Depends(get_db)):
    """Get a single collection by ID"""
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found"
        )

    # Convert image to base64 data URL if exists
    image_url = None
    if collection.image:
        base64_image = base64.b64encode(collection.image).decode('utf-8')
        image_url = f"data:{collection.image_mimetype or 'image/jpeg'};base64,{base64_image}"

    return {
        "id": collection.id,
        "name": collection.name,
        "description": collection.description,
        "image_url": image_url,
        "created_at": collection.created_at.isoformat() if collection.created_at else None
    }

@router.post("/", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
async def create_collection(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new collection (Admin only)"""
    # Check if collection with same name already exists
    existing = db.query(Collection).filter(Collection.name == name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Collection with this name already exists"
        )

    # Process image if provided
    image_binary = None
    image_mimetype = None
    if image and image.filename:
        image_binary = await image.read()
        image_mimetype = image.content_type or "image/jpeg"

    # Create collection
    new_collection = Collection(
        name=name,
        description=description,
        image=image_binary,
        image_mimetype=image_mimetype
    )

    db.add(new_collection)
    db.commit()
    db.refresh(new_collection)

    # Convert image to base64 data URL if exists
    image_url = None
    if new_collection.image:
        base64_image = base64.b64encode(new_collection.image).decode('utf-8')
        image_url = f"data:{new_collection.image_mimetype or 'image/jpeg'};base64,{base64_image}"

    return {
        "id": new_collection.id,
        "name": new_collection.name,
        "description": new_collection.description,
        "image_url": image_url,
        "created_at": new_collection.created_at.isoformat() if new_collection.created_at else None
    }

@router.put("/{collection_id}", response_model=CollectionResponse)
async def update_collection(
    collection_id: int,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update a collection (Admin only)"""
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found"
        )

    # Update fields
    if name is not None:
        # Check if new name conflicts with another collection
        existing = db.query(Collection).filter(
            Collection.name == name,
            Collection.id != collection_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Collection with this name already exists"
            )
        collection.name = name

    if description is not None:
        collection.description = description

    # Update image if provided
    if image and image.filename:
        image_binary = await image.read()
        collection.image = image_binary
        collection.image_mimetype = image.content_type or "image/jpeg"

    db.commit()
    db.refresh(collection)

    # Convert image to base64 data URL if exists
    image_url = None
    if collection.image:
        base64_image = base64.b64encode(collection.image).decode('utf-8')
        image_url = f"data:{collection.image_mimetype or 'image/jpeg'};base64,{base64_image}"

    return {
        "id": collection.id,
        "name": collection.name,
        "description": collection.description,
        "image_url": image_url,
        "created_at": collection.created_at.isoformat() if collection.created_at else None
    }

@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(
    collection_id: int,
    current_user = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a collection (Admin only)"""
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found"
        )

    db.delete(collection)
    db.commit()
    return None
