from sqlmodel import SQLModel, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal

from .enums import LineItemType


class PriceLibraryItem(SQLModel, table=True):
    __tablename__ = "price_library_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    
    company_id: int = Field(foreign_key="companies.id", index=True)
    
    name: str = Field(max_length=255, index=True)
    description: Optional[str] = Field(default=None)
    long_description: Optional[str] = Field(default=None)
    
    item_type: LineItemType = Field(default=LineItemType.SUPPLY)
    
    category: Optional[str] = Field(default=None, max_length=100, index=True)
    subcategory: Optional[str] = Field(default=None, max_length=100)
    trade: Optional[str] = Field(default=None, max_length=100)  # Corps de métier
    
    unit: str = Field(default="u", max_length=50)
    unit_price: Decimal = Field(max_digits=10, decimal_places=2)
    
    tax_rate: Decimal = Field(default=Decimal("20.00"), max_digits=5, decimal_places=2)
    
    # Infos produit
    reference: Optional[str] = Field(default=None, max_length=100)
    brand: Optional[str] = Field(default=None, max_length=100)
    
    # Coût d'achat (pour calcul marge)
    cost_price: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    
    # Statistiques
    usage_count: int = Field(default=0)
    is_favorite: bool = Field(default=False)
    
    is_active: bool = Field(default=True)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)


class PriceLibraryItemCreate(SQLModel):
    name: str
    description: Optional[str] = None
    long_description: Optional[str] = None
    item_type: LineItemType = LineItemType.SUPPLY
    category: Optional[str] = None
    subcategory: Optional[str] = None
    trade: Optional[str] = None
    unit: str = "u"
    unit_price: Decimal
    tax_rate: Decimal = Decimal("20.00")
    reference: Optional[str] = None
    brand: Optional[str] = None
    cost_price: Optional[Decimal] = None


class PriceLibraryItemRead(SQLModel):
    id: int
    company_id: int
    name: str
    description: Optional[str]
    long_description: Optional[str]
    item_type: LineItemType
    category: Optional[str]
    subcategory: Optional[str]
    trade: Optional[str]
    unit: str
    unit_price: Decimal
    tax_rate: Decimal
    reference: Optional[str]
    brand: Optional[str]
    cost_price: Optional[Decimal]
    usage_count: int
    is_favorite: bool
    is_active: bool
    created_at: datetime


class PriceLibraryItemUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    long_description: Optional[str] = None
    item_type: Optional[LineItemType] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    trade: Optional[str] = None
    unit: Optional[str] = None
    unit_price: Optional[Decimal] = None
    tax_rate: Optional[Decimal] = None
    reference: Optional[str] = None
    brand: Optional[str] = None
    cost_price: Optional[Decimal] = None
    is_active: Optional[bool] = None
    is_favorite: Optional[bool] = None
