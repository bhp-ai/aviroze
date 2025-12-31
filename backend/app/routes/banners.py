from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.db_models import Banner, BannerStatus, BannerType, User
from app.schemas.banner import BannerCreate, BannerUpdate, BannerResponse
from app.auth import get_current_admin_user
import json
import base64

router = APIRouter(prefix="/api/banners", tags=["Banners"])

def convert_image_to_data_url(image_binary: bytes, mimetype: str) -> str:
    """Convert binary image data to base64 data URL"""
    if not image_binary:
        return ""
    base64_image = base64.b64encode(image_binary).decode('utf-8')
    return f"data:{mimetype};base64,{base64_image}"

@router.get("/", response_model=List[BannerResponse])
async def get_all_banners(
    status: Optional[str] = None,
    banner_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get all banners (Admin only)"""
    query = db.query(Banner)

    if status:
        query = query.filter(Banner.status == status)

    if banner_type:
        query = query.filter(Banner.banner_type == banner_type)

    banners = query.order_by(Banner.display_order, Banner.created_at.desc()).all()

    result = []
    for banner in banners:
        banner_dict = {
            "id": banner.id,
            "title": banner.title,
            "subtitle": banner.subtitle,
            "description": banner.description,
            "banner_type": banner.banner_type,
            "status": banner.status,
            "display_order": banner.display_order,
            "image": convert_image_to_data_url(banner.image, banner.image_mimetype or "image/jpeg") if banner.image else None,
            "mobile_image": convert_image_to_data_url(banner.mobile_image, banner.mobile_image_mimetype or "image/jpeg") if banner.mobile_image else None,
            "link_url": banner.link_url,
            "link_text": banner.link_text,
            "link_target": banner.link_target,
            "start_date": banner.start_date,
            "end_date": banner.end_date,
            "text_color": banner.text_color,
            "background_color": banner.background_color,
            "button_color": banner.button_color,
            "view_count": banner.view_count,
            "click_count": banner.click_count,
            "created_at": banner.created_at,
            "updated_at": banner.updated_at
        }
        result.append(banner_dict)

    return result

@router.get("/active", response_model=List[BannerResponse])
async def get_active_banners(
    banner_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get active banners for public display"""
    now = datetime.now()

    query = db.query(Banner).filter(Banner.status == BannerStatus.ACTIVE)

    # Filter by date range if scheduled
    query = query.filter(
        or_(
            Banner.start_date.is_(None),
            Banner.start_date <= now
        )
    ).filter(
        or_(
            Banner.end_date.is_(None),
            Banner.end_date >= now
        )
    )

    if banner_type:
        query = query.filter(Banner.banner_type == banner_type)

    banners = query.order_by(Banner.display_order, Banner.created_at.desc()).all()

    result = []
    for banner in banners:
        banner_dict = {
            "id": banner.id,
            "title": banner.title,
            "subtitle": banner.subtitle,
            "description": banner.description,
            "banner_type": banner.banner_type,
            "status": banner.status,
            "display_order": banner.display_order,
            "image": convert_image_to_data_url(banner.image, banner.image_mimetype or "image/jpeg") if banner.image else None,
            "mobile_image": convert_image_to_data_url(banner.mobile_image, banner.mobile_image_mimetype or "image/jpeg") if banner.mobile_image else None,
            "link_url": banner.link_url,
            "link_text": banner.link_text,
            "link_target": banner.link_target,
            "start_date": banner.start_date,
            "end_date": banner.end_date,
            "text_color": banner.text_color,
            "background_color": banner.background_color,
            "button_color": banner.button_color,
            "view_count": banner.view_count,
            "click_count": banner.click_count,
            "created_at": banner.created_at,
            "updated_at": banner.updated_at
        }
        result.append(banner_dict)

    return result

@router.get("/{banner_id}", response_model=BannerResponse)
async def get_banner(
    banner_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get a single banner by ID (Admin only)"""
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Banner not found"
        )

    return {
        "id": banner.id,
        "title": banner.title,
        "subtitle": banner.subtitle,
        "description": banner.description,
        "banner_type": banner.banner_type,
        "status": banner.status,
        "display_order": banner.display_order,
        "image": convert_image_to_data_url(banner.image, banner.image_mimetype or "image/jpeg") if banner.image else None,
        "mobile_image": convert_image_to_data_url(banner.mobile_image, banner.mobile_image_mimetype or "image/jpeg") if banner.mobile_image else None,
        "link_url": banner.link_url,
        "link_text": banner.link_text,
        "link_target": banner.link_target,
        "start_date": banner.start_date,
        "end_date": banner.end_date,
        "text_color": banner.text_color,
        "background_color": banner.background_color,
        "button_color": banner.button_color,
        "view_count": banner.view_count,
        "click_count": banner.click_count,
        "created_at": banner.created_at,
        "updated_at": banner.updated_at
    }

@router.post("/", response_model=BannerResponse, status_code=status.HTTP_201_CREATED)
async def create_banner(
    title: str = Form(...),
    subtitle: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    banner_type: str = Form("promotional"),
    status: str = Form("inactive"),
    display_order: int = Form(0),
    link_url: Optional[str] = Form(None),
    link_text: Optional[str] = Form(None),
    link_target: str = Form("_self"),
    start_date: Optional[str] = Form(None),
    end_date: Optional[str] = Form(None),
    text_color: Optional[str] = Form(None),
    background_color: Optional[str] = Form(None),
    button_color: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    mobile_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new banner (Admin only)"""

    # Parse dates
    start_datetime = None
    end_datetime = None
    if start_date:
        try:
            start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        except:
            pass
    if end_date:
        try:
            end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except:
            pass

    new_banner = Banner(
        title=title,
        subtitle=subtitle,
        description=description,
        banner_type=banner_type,
        status=status,
        display_order=display_order,
        link_url=link_url,
        link_text=link_text,
        link_target=link_target,
        start_date=start_datetime,
        end_date=end_datetime,
        text_color=text_color,
        background_color=background_color,
        button_color=button_color
    )

    # Handle image upload
    if image and image.filename:
        image_binary = await image.read()
        new_banner.image = image_binary
        new_banner.image_mimetype = image.content_type or "image/jpeg"

    # Handle mobile image upload
    if mobile_image and mobile_image.filename:
        mobile_image_binary = await mobile_image.read()
        new_banner.mobile_image = mobile_image_binary
        new_banner.mobile_image_mimetype = mobile_image.content_type or "image/jpeg"

    db.add(new_banner)
    db.commit()
    db.refresh(new_banner)

    return {
        "id": new_banner.id,
        "title": new_banner.title,
        "subtitle": new_banner.subtitle,
        "description": new_banner.description,
        "banner_type": new_banner.banner_type,
        "status": new_banner.status,
        "display_order": new_banner.display_order,
        "image": convert_image_to_data_url(new_banner.image, new_banner.image_mimetype or "image/jpeg") if new_banner.image else None,
        "mobile_image": convert_image_to_data_url(new_banner.mobile_image, new_banner.mobile_image_mimetype or "image/jpeg") if new_banner.mobile_image else None,
        "link_url": new_banner.link_url,
        "link_text": new_banner.link_text,
        "link_target": new_banner.link_target,
        "start_date": new_banner.start_date,
        "end_date": new_banner.end_date,
        "text_color": new_banner.text_color,
        "background_color": new_banner.background_color,
        "button_color": new_banner.button_color,
        "view_count": new_banner.view_count,
        "click_count": new_banner.click_count,
        "created_at": new_banner.created_at,
        "updated_at": new_banner.updated_at
    }

@router.put("/{banner_id}", response_model=BannerResponse)
async def update_banner(
    banner_id: int,
    title: Optional[str] = Form(None),
    subtitle: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    banner_type: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    display_order: Optional[int] = Form(None),
    link_url: Optional[str] = Form(None),
    link_text: Optional[str] = Form(None),
    link_target: Optional[str] = Form(None),
    start_date: Optional[str] = Form(None),
    end_date: Optional[str] = Form(None),
    text_color: Optional[str] = Form(None),
    background_color: Optional[str] = Form(None),
    button_color: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    mobile_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Update a banner (Admin only)"""
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Banner not found"
        )

    # Update fields
    if title is not None:
        banner.title = title
    if subtitle is not None:
        banner.subtitle = subtitle
    if description is not None:
        banner.description = description
    if banner_type is not None:
        banner.banner_type = banner_type
    if status is not None:
        banner.status = status
    if display_order is not None:
        banner.display_order = display_order
    if link_url is not None:
        banner.link_url = link_url
    if link_text is not None:
        banner.link_text = link_text
    if link_target is not None:
        banner.link_target = link_target
    if text_color is not None:
        banner.text_color = text_color
    if background_color is not None:
        banner.background_color = background_color
    if button_color is not None:
        banner.button_color = button_color

    # Parse and update dates
    if start_date is not None:
        try:
            banner.start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00')) if start_date else None
        except:
            pass
    if end_date is not None:
        try:
            banner.end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if end_date else None
        except:
            pass

    # Handle image upload
    if image and image.filename:
        image_binary = await image.read()
        banner.image = image_binary
        banner.image_mimetype = image.content_type or "image/jpeg"

    # Handle mobile image upload
    if mobile_image and mobile_image.filename:
        mobile_image_binary = await mobile_image.read()
        banner.mobile_image = mobile_image_binary
        banner.mobile_image_mimetype = mobile_image.content_type or "image/jpeg"

    db.commit()
    db.refresh(banner)

    return {
        "id": banner.id,
        "title": banner.title,
        "subtitle": banner.subtitle,
        "description": banner.description,
        "banner_type": banner.banner_type,
        "status": banner.status,
        "display_order": banner.display_order,
        "image": convert_image_to_data_url(banner.image, banner.image_mimetype or "image/jpeg") if banner.image else None,
        "mobile_image": convert_image_to_data_url(banner.mobile_image, banner.mobile_image_mimetype or "image/jpeg") if banner.mobile_image else None,
        "link_url": banner.link_url,
        "link_text": banner.link_text,
        "link_target": banner.link_target,
        "start_date": banner.start_date,
        "end_date": banner.end_date,
        "text_color": banner.text_color,
        "background_color": banner.background_color,
        "button_color": banner.button_color,
        "view_count": banner.view_count,
        "click_count": banner.click_count,
        "created_at": banner.created_at,
        "updated_at": banner.updated_at
    }

@router.delete("/{banner_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_banner(
    banner_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Delete a banner (Admin only)"""
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Banner not found"
        )

    db.delete(banner)
    db.commit()
    return None

@router.post("/{banner_id}/view", status_code=status.HTTP_204_NO_CONTENT)
async def track_banner_view(
    banner_id: int,
    db: Session = Depends(get_db)
):
    """Track banner view (increment view count)"""
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Banner not found"
        )

    banner.view_count += 1
    db.commit()
    return None

@router.post("/{banner_id}/click", status_code=status.HTTP_204_NO_CONTENT)
async def track_banner_click(
    banner_id: int,
    db: Session = Depends(get_db)
):
    """Track banner click (increment click count)"""
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Banner not found"
        )

    banner.click_count += 1
    db.commit()
    return None
