from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from decimal import Decimal

from .enums import CustomerType

if TYPE_CHECKING:
    from .company import Company
    from .address import Address
    from .project import Project
    from .quote import Quote
    from .invoice import Invoice


class Customer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    company_id: int = Field(foreign_key="companies.id", index=True)
    
    type: CustomerType = Field(default=CustomerType.COMPANY)
    name: str = Field(max_length=255, index=True)
    contact_name: Optional[str] = Field(default=None, max_length=255)
    
    email: Optional[str] = Field(default=None, max_length=255, index=True)
    phone: Optional[str] = Field(default=None, max_length=20)
    mobile: Optional[str] = Field(default=None, max_length=20)
    website: Optional[str] = Field(default=None, max_length=255)
    
    # Informations légales
    siret: Optional[str] = Field(default=None, max_length=20)
    vat: Optional[str] = Field(default=None, max_length=50)
    
    # Adresses
    address_id: Optional[int] = Field(default=None, foreign_key="addresses.id")
    billing_address_id: Optional[int] = Field(default=None, foreign_key="addresses.id")
    
    notes: Optional[str] = Field(default=None)
    
    is_active: bool = Field(default=True)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)

    # Relations - commentées car elles causent des problèmes de migration
    # projects: List["Project"] = Relationship(back_populates="customer")
    # quotes: List["Quote"] = Relationship(back_populates="customer")
    # invoices: List["Invoice"] = Relationship(back_populates="customer")


class CustomerCreate(SQLModel):
    type: CustomerType = CustomerType.COMPANY
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    website: Optional[str] = None
    siret: Optional[str] = None
    vat: Optional[str] = None
    notes: Optional[str] = None
    address: Optional[dict] = None
    billing_address: Optional[dict] = None
    
    def get_name(self) -> str:
        """Génère le nom à partir de name ou first_name + last_name"""
        if self.name:
            return self.name
        parts = []
        if self.first_name:
            parts.append(self.first_name)
        if self.last_name:
            parts.append(self.last_name)
        if not parts:
            raise ValueError("Either 'name' or 'first_name'/'last_name' must be provided")
        return " ".join(parts)


class CustomerRead(SQLModel):
    id: int
    company_id: int
    type: CustomerType
    name: str
    contact_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    mobile: Optional[str]
    website: Optional[str]
    siret: Optional[str]
    vat: Optional[str]
    notes: Optional[str]
    is_active: bool
    created_at: datetime
    address: Optional[dict] = None
    billing_address: Optional[dict] = None


class CustomerUpdate(SQLModel):
    type: Optional[CustomerType] = None
    name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    website: Optional[str] = None
    siret: Optional[str] = None
    vat: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None
    address: Optional[dict] = None
    billing_address: Optional[dict] = None
