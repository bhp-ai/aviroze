from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class BannerBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    subtitle: Optional[str] = None
    description: Optional[str] = None
    banner_type: str = Field(default="promotional")  # hero, promotional, announcement, category
    status: str = Field(default="inactive")  # active, inactive, scheduled
    display_order: int = Field(default=0, ge=0)
    link_url: Optional[str] = None
    link_text: Optional[str] = None
    link_target: str = Field(default="_self")
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    text_color: Optional[str] = None
    background_color: Optional[str] = None
    button_color: Optional[str] = None

class BannerCreate(BannerBase):
    pass

class BannerUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    subtitle: Optional[str] = None
    description: Optional[str] = None
    banner_type: Optional[str] = None
    status: Optional[str] = None
    display_order: Optional[int] = Field(None, ge=0)
    link_url: Optional[str] = None
    link_text: Optional[str] = None
    link_target: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    text_color: Optional[str] = None
    background_color: Optional[str] = None
    button_color: Optional[str] = None

class BannerResponse(BannerBase):
    id: int
    image: Optional[str] = None  # Base64 data URL
    mobile_image: Optional[str] = None  # Base64 data URL
    view_count: int
    click_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
