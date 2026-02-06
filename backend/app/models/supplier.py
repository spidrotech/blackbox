from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import Column, JSON, String
from sqlalchemy.types import TypeDecorator

from .enums import SupplierType

if TYPE_CHECKING:
    from .company import Company
    from .address import Address
    from .purchase import Purchase


class Supplier(SQLModel, table=True):
    __tablename__ = "suppliers"

    id: Optional[int] = Field(default=None, primary_key=True)
    
    company_id: int = Field(foreign_key="companies.id", index=True)
    
    name: str = Field(max_length=255, index=True)
    type: SupplierType = Field(default=SupplierType.MATERIALS)
    
    siret: Optional[str] = Field(default=None, max_length=14)
    vat_number: Optional[str] = Field(default=None, max_length=13)
    
    contact_name: Optional[str] = Field(default=None, max_length=255)
    email: Optional[str] = Field(default=None, max_length=180)
    phone: Optional[str] = Field(default=None, max_length=20)
    website: Optional[str] = Field(default=None, max_length=255)
    
    address_id: Optional[int] = Field(default=None, foreign_key="addresses.id")
    
    # Informations bancaires
    iban: Optional[str] = Field(default=None, max_length=34)
    bic: Optional[str] = Field(default=None, max_length=11)
    
    payment_terms_days: int = Field(default=30)
    
    notes: Optional[str] = Field(default=None)
    categories: Optional[str] = Field(default=None, sa_column=Column(JSON))
    default_discount: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)
    
    is_active: bool = Field(default=True)
    is_favorite: bool = Field(default=False)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)

    # Relations
    purchases: List["Purchase"] = Relationship(back_populates="supplier")


class SupplierCreate(SQLModel):
    name: str
    type: SupplierType = SupplierType.MATERIALS
    siret: Optional[str] = None
    vat_number: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    iban: Optional[str] = None
    bic: Optional[str] = None
    payment_terms_days: int = 30
    notes: Optional[str] = None
    categories: Optional[List[str]] = None
    default_discount: Optional[Decimal] = None
    address: Optional[dict] = None


class SupplierRead(SQLModel):
    id: int
    company_id: int
    name: str
    type: SupplierType
    siret: Optional[str]
    vat_number: Optional[str]
    contact_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    website: Optional[str]
    iban: Optional[str]
    bic: Optional[str]
    payment_terms_days: int
    notes: Optional[str]
    categories: Optional[List[str]]
    default_discount: Optional[Decimal]
    is_active: bool
    is_favorite: bool
    created_at: datetime
    address: Optional[dict] = None


class SupplierUpdate(SQLModel):
    name: Optional[str] = None
    type: Optional[SupplierType] = None
    siret: Optional[str] = None
    vat_number: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    iban: Optional[str] = None
    bic: Optional[str] = None
    payment_terms_days: Optional[int] = None
    notes: Optional[str] = None
    categories: Optional[List[str]] = None
    default_discount: Optional[Decimal] = None
    is_active: Optional[bool] = None
    is_favorite: Optional[bool] = None
    address: Optional[dict] = None
