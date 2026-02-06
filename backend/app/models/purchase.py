from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import date, datetime
from decimal import Decimal

from .enums import PurchaseStatus, PurchaseCategory

if TYPE_CHECKING:
    from .company import Company
    from .supplier import Supplier
    from .project import Project


class Purchase(SQLModel, table=True):
    __tablename__ = "purchases"

    id: Optional[int] = Field(default=None, primary_key=True)
    
    reference: str = Field(max_length=50, unique=True, index=True)
    
    company_id: int = Field(foreign_key="companies.id", index=True)
    supplier_id: Optional[int] = Field(default=None, foreign_key="suppliers.id")
    project_id: Optional[int] = Field(default=None, foreign_key="projects.id")
    created_by_id: Optional[int] = Field(default=None, foreign_key="users.id")
    
    category: PurchaseCategory = Field(default=PurchaseCategory.MATERIALS)
    description: str = Field(max_length=255)
    supplier_reference: Optional[str] = Field(default=None, max_length=100)
    
    # Dates
    purchase_date: date = Field(default_factory=date.today)
    due_date: Optional[date] = Field(default=None)
    paid_date: Optional[date] = Field(default=None)
    
    # Montants
    total_ht: Decimal = Field(max_digits=12, decimal_places=2)
    vat_rate: Decimal = Field(default=Decimal("20.00"), max_digits=5, decimal_places=2)
    total_vat: Optional[Decimal] = Field(default=None, max_digits=12, decimal_places=2)
    total_ttc: Optional[Decimal] = Field(default=None, max_digits=12, decimal_places=2)
    
    amount_paid: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    
    status: PurchaseStatus = Field(default=PurchaseStatus.PENDING)
    payment_method: Optional[str] = Field(default=None, max_length=50)
    
    notes: Optional[str] = Field(default=None)
    attachments: Optional[str] = Field(default=None)  # JSON array as string
    
    is_recurring: bool = Field(default=False)
    is_general_expense: bool = Field(default=False)
    
    ocr_data: Optional[str] = Field(default=None)  # JSON object as string
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)

    # Relations
    supplier: Optional["Supplier"] = Relationship(back_populates="purchases")
    project: Optional["Project"] = Relationship(back_populates="purchases")

    def calculate_totals(self) -> None:
        """Calcule TVA et TTC"""
        self.total_vat = self.total_ht * self.vat_rate / 100
        self.total_ttc = self.total_ht + self.total_vat

    def update_status(self) -> None:
        """Met à jour le statut en fonction du paiement"""
        if self.amount_paid >= self.total_ttc:
            self.status = PurchaseStatus.PAID
        elif self.amount_paid > 0:
            self.status = PurchaseStatus.PARTIAL
        else:
            self.status = PurchaseStatus.PENDING


class PurchaseCreate(SQLModel):
    supplier_id: Optional[int] = None
    project_id: Optional[int] = None
    category: PurchaseCategory = PurchaseCategory.MATERIALS
    description: str
    supplier_reference: Optional[str] = None
    purchase_date: Optional[date] = None
    due_date: Optional[date] = None
    total_ht: Decimal
    vat_rate: Decimal = Decimal("20.00")
    notes: Optional[str] = None
    is_recurring: bool = False
    is_general_expense: bool = False


class PurchaseRead(SQLModel):
    id: int
    reference: str
    company_id: int
    supplier_id: Optional[int]
    project_id: Optional[int]
    category: PurchaseCategory
    description: str
    supplier_reference: Optional[str]
    purchase_date: date
    due_date: Optional[date]
    paid_date: Optional[date]
    total_ht: Decimal
    vat_rate: Decimal
    total_vat: Optional[Decimal]
    total_ttc: Optional[Decimal]
    amount_paid: Decimal
    status: PurchaseStatus
    payment_method: Optional[str]
    notes: Optional[str]
    is_recurring: bool
    is_general_expense: bool
    created_at: datetime
    supplier: Optional[dict] = None
    project: Optional[dict] = None


class PurchaseUpdate(SQLModel):
    supplier_id: Optional[int] = None
    project_id: Optional[int] = None
    category: Optional[PurchaseCategory] = None
    description: Optional[str] = None
    supplier_reference: Optional[str] = None
    purchase_date: Optional[date] = None
    due_date: Optional[date] = None
    total_ht: Optional[Decimal] = None
    vat_rate: Optional[Decimal] = None
    notes: Optional[str] = None
    is_recurring: Optional[bool] = None
    is_general_expense: Optional[bool] = None


class PurchasePayment(SQLModel):
    amount: Decimal
    payment_date: Optional[date] = None
    payment_method: Optional[str] = None
