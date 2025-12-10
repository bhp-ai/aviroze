from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Product(BaseModel):
    id: Optional[str] = None
    name: str
    slug: str
    description: str
    price: float
    images: List[str]
    category: str
    sizes: List[str]
    colors: List[str]
    stock: int
    in_stock: bool = True
    featured: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Classic Blazer",
                "slug": "classic-blazer",
                "description": "Premium blazer for professional women",
                "price": 1250000,
                "images": ["image1.jpg", "image2.jpg"],
                "category": "Outerwear",
                "sizes": ["XS", "S", "M", "L", "XL"],
                "colors": ["Black", "Navy", "Beige"],
                "stock": 50,
                "in_stock": True,
                "featured": True
            }
        }
