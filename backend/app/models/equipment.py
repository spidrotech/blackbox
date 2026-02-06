from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import date, datetime
from decimal import Decimal

from .enums import EquipmentStatus, EquipmentOwnership

if TYPE_CHECKING:
    from .company import Company
    from .project import Project
    from .supplier import Supplier


class Equipment(SQLModel, table=True):
    __tablename__ = "equipment"

    id: Optional[int] = Field(default=None, primary_key=True)
    
    company_id: int = Field(foreign_key="companies.id", index=True)
    
    name: str = Field(max_length=100, index=True)
    code: Optional[str] = Field(default=None, max_length=100)  # Code interne
    serial_number: Optional[str] = Field(default=None, max_length=100)
    brand: Optional[str] = Field(default=None, max_length=100)
    model: Optional[str] = Field(default=None, max_length=100)
    category: Optional[str] = Field(default=None, max_length=100)  # véhicule, outil électrique, échafaudage...
    
    ownership_type: EquipmentOwnership = Field(default=EquipmentOwnership.OWNED)
    status: EquipmentStatus = Field(default=EquipmentStatus.AVAILABLE, index=True)
    
    # Achat
    purchase_date: Optional[date] = Field(default=None)
    purchase_price: Optional[Decimal] = Field(default=None, max_digits=12, decimal_places=2)
    
    # Tarifs
    hourly_rate: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    daily_rate: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    
    # Location
    rental_supplier_id: Optional[int] = Field(default=None, foreign_key="suppliers.id")
    rental_start_date: Optional[date] = Field(default=None)
    rental_end_date: Optional[date] = Field(default=None)
    
    # Maintenance
    last_maintenance_date: Optional[date] = Field(default=None)
    next_maintenance_date: Optional[date] = Field(default=None)
    
    total_hours_used: Decimal = Field(default=Decimal("0.00"), max_digits=10, decimal_places=2)
    
    current_project_id: Optional[int] = Field(default=None, foreign_key="projects.id")
    
    photos: Optional[str] = Field(default=None)  # JSON array as string
    notes: Optional[str] = Field(default=None)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)


class EquipmentCreate(SQLModel):
    name: str
    code: Optional[str] = None
    serial_number: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    category: Optional[str] = None
    ownership_type: EquipmentOwnership = EquipmentOwnership.OWNED
    status: EquipmentStatus = EquipmentStatus.AVAILABLE
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    hourly_rate: Optional[Decimal] = None
    daily_rate: Optional[Decimal] = None
    rental_supplier_id: Optional[int] = None
    rental_start_date: Optional[date] = None
    rental_end_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None
    notes: Optional[str] = None


class EquipmentRead(SQLModel):
    id: int
    company_id: int
    name: str
    code: Optional[str]
    serial_number: Optional[str]
    brand: Optional[str]
    model: Optional[str]
    category: Optional[str]
    ownership_type: EquipmentOwnership
    status: EquipmentStatus
    purchase_date: Optional[date]
    purchase_price: Optional[Decimal]
    hourly_rate: Optional[Decimal]
    daily_rate: Optional[Decimal]
    rental_supplier_id: Optional[int]
    rental_start_date: Optional[date]
    rental_end_date: Optional[date]
    last_maintenance_date: Optional[date]
    next_maintenance_date: Optional[date]
    total_hours_used: Decimal
    current_project_id: Optional[int]
    photos: Optional[List[str]]
    notes: Optional[str]
    created_at: datetime


class EquipmentUpdate(SQLModel):
    name: Optional[str] = None
    code: Optional[str] = None
    serial_number: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    category: Optional[str] = None
    ownership_type: Optional[EquipmentOwnership] = None
    status: Optional[EquipmentStatus] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    hourly_rate: Optional[Decimal] = None
    daily_rate: Optional[Decimal] = None
    rental_supplier_id: Optional[int] = None
    rental_start_date: Optional[date] = None
    rental_end_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None
    notes: Optional[str] = None


class EquipmentUsage(SQLModel, table=True):
    __tablename__ = "equipment_usages"

    id: Optional[int] = Field(default=None, primary_key=True)
    
    equipment_id: int = Field(foreign_key="equipment.id", index=True)
    project_id: int = Field(foreign_key="projects.id")
    user_id: Optional[int] = Field(default=None, foreign_key="users.id")
    
    start_date: date
    end_date: Optional[date] = Field(default=None)
    hours_used: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    
    notes: Optional[str] = Field(default=None)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
