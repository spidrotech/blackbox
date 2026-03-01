from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import JSON

from .enums import QuoteStatus

if TYPE_CHECKING:
    from .company import Company
    from .customer import Customer
    from .project import Project
    from .line_item import LineItem
    from .invoice import Invoice


class Quote(SQLModel, table=True):
    __tablename__ = "quotes"

    id: Optional[int] = Field(default=None, primary_key=True)
    
    company_id: int = Field(foreign_key="companies.id", index=True)
    customer_id: int = Field(foreign_key="customers.id", index=True)
    project_id: Optional[int] = Field(default=None, foreign_key="projects.id")
    
    reference: str = Field(max_length=50, unique=True, index=True)
    status: QuoteStatus = Field(default=QuoteStatus.DRAFT, index=True)
    
    description: Optional[str] = Field(default=None)
    
    # Remises globales
    global_discount: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    global_discount_percent: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)
    
    # Dates
    quote_date: date = Field(default_factory=date.today)
    expiry_date: date
    accepted_date: Optional[date] = Field(default=None)
    signed_date: Optional[date] = Field(default=None)
    finalized_date: Optional[date] = Field(default=None)
    
    # Chantier
    work_start_date: Optional[date] = Field(default=None)
    estimated_duration: Optional[str] = Field(default=None, max_length=100)
    worksite_address: Optional[str] = Field(default=None)
    
    # Acompte
    deposit_percent: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)
    deposit_amount: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    
    # Gestion des déchets
    waste_management: Optional[str] = Field(default=None)  # JSON object as string

    # Primes
    cee_premium: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    mpr_premium: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)

    # Informations supplémentaires
    bank_details: Optional[str] = Field(default=None)
    footer_notes: Optional[str] = Field(default=None)
    payment_methods: Optional[str] = Field(default=None)  # JSON array as string
    legal_mentions: Optional[str] = Field(default=None)
    
    notes: Optional[str] = Field(default=None)
    payment_terms: Optional[str] = Field(default=None)
    conditions: Optional[str] = Field(default=None)
    
    created_by_id: Optional[int] = Field(default=None, foreign_key="users.id")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)

    # Relations
    # customer: Optional["Customer"] = Relationship()  # Causait des erreurs
    project: Optional["Project"] = Relationship(back_populates="quotes")
    line_items: List["LineItem"] = Relationship(back_populates="quote")
    invoices: List["Invoice"] = Relationship(back_populates="quote")

    @property
    def total_ht(self) -> Decimal:
        """Calcul du total HT"""
        total = sum(item.total_ht for item in self.line_items) if self.line_items else Decimal(0)
        if self.global_discount:
            total -= self.global_discount
        elif self.global_discount_percent:
            total -= total * self.global_discount_percent / 100
        return total

    @property
    def total_tva(self) -> Decimal:
        """Calcul du total TVA"""
        return sum(item.total_tva for item in self.line_items) if self.line_items else Decimal(0)

    @property
    def total_ttc(self) -> Decimal:
        """Calcul du total TTC"""
        return self.total_ht + self.total_tva



class QuoteCreate(SQLModel):
    customer_id: int
    project_id: Optional[int] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    quote_date: Optional[date] = None
    expiry_date: Optional[date] = None
    work_start_date: Optional[date] = None
    estimated_duration: Optional[str] = None
    worksite_address: Optional[str] = None
    deposit_percent: Optional[Decimal] = None
    deposit_amount: Optional[Decimal] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    conditions: Optional[str] = None
    validity_days: Optional[int] = None
    discount_percent: Optional[float] = None
    cee_premium: Optional[float] = None
    mpr_premium: Optional[float] = None
    waste_management_fee: Optional[float] = None
    terms_and_conditions: Optional[str] = None
    line_items: Optional[List[dict]] = None


class QuoteRead(SQLModel):
    id: int
    company_id: int
    customer_id: int
    project_id: Optional[int]
    reference: str
    status: QuoteStatus
    description: Optional[str]
    quote_date: date
    expiry_date: date
    accepted_date: Optional[date]
    signed_date: Optional[date]
    work_start_date: Optional[date]
    estimated_duration: Optional[str]
    deposit_percent: Optional[Decimal]
    deposit_amount: Optional[Decimal]
    notes: Optional[str]
    total_ht: Optional[Decimal] = None
    total_tva: Optional[Decimal] = None
    total_ttc: Optional[Decimal] = None
    created_at: datetime
    customer: Optional[dict] = None
    line_items: Optional[List[dict]] = None


class QuoteUpdate(SQLModel):
    customer_id: Optional[int] = None
    project_id: Optional[int] = None
    status: Optional[QuoteStatus] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    quote_date: Optional[date] = None
    expiry_date: Optional[date] = None
    work_start_date: Optional[date] = None
    estimated_duration: Optional[str] = None
    worksite_address: Optional[str] = None
    deposit_percent: Optional[Decimal] = None
    deposit_amount: Optional[Decimal] = None
    global_discount: Optional[Decimal] = None
    global_discount_percent: Optional[Decimal] = None
    cee_premium: Optional[Decimal] = None
    mpr_premium: Optional[Decimal] = None
    waste_management: Optional[str] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    conditions: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    footer_notes: Optional[str] = None
    bank_details: Optional[str] = None
    legal_mentions: Optional[str] = None
    payment_methods: Optional[str] = None
    line_items: Optional[List[dict]] = None
