from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import date, datetime
from decimal import Decimal

from .enums import InvoiceStatus

if TYPE_CHECKING:
    from .company import Company
    from .customer import Customer
    from .project import Project
    from .quote import Quote
    from .line_item import LineItem


class Invoice(SQLModel, table=True):
    __tablename__ = "invoices"

    id: Optional[int] = Field(default=None, primary_key=True)
    
    company_id: int = Field(foreign_key="companies.id", index=True)
    customer_id: int = Field(foreign_key="customers.id", index=True)
    project_id: Optional[int] = Field(default=None, foreign_key="projects.id")
    quote_id: Optional[int] = Field(default=None, foreign_key="quotes.id")
    
    reference: str = Field(max_length=50, unique=True, index=True)
    status: InvoiceStatus = Field(default=InvoiceStatus.DRAFT, index=True)
    
    description: Optional[str] = Field(default=None)
    
    # Remises globales
    global_discount: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    global_discount_percent: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)
    
    # Dates
    invoice_date: date = Field(default_factory=date.today)
    due_date: date
    paid_date: Optional[date] = Field(default=None)
    
    # Paiement
    amount_paid: Optional[Decimal] = Field(default=Decimal(0), max_digits=10, decimal_places=2)
    
    # Informations supplémentaires
    notes: Optional[str] = Field(default=None)
    payment_terms: Optional[str] = Field(default=None)
    bank_details: Optional[str] = Field(default=None)
    
    # Type de facture
    invoice_type: str = Field(default="invoice", max_length=50)  # invoice, credit_note, proforma
    
    created_by_id: Optional[int] = Field(default=None, foreign_key="users.id")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)

    # Relations
    # customer: Optional["Customer"] = Relationship()  # Causait des erreurs
    project: Optional["Project"] = Relationship(back_populates="invoices")
    quote: Optional["Quote"] = Relationship(back_populates="invoices")
    line_items: List["LineItem"] = Relationship(back_populates="invoice")

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

    @property
    def remaining_amount(self) -> Decimal:
        """Montant restant à payer"""
        return self.total_ttc - (self.amount_paid or Decimal(0))


class InvoiceCreate(SQLModel):
    customer_id: int
    project_id: Optional[int] = None
    quote_id: Optional[int] = None
    description: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    bank_details: Optional[str] = None
    invoice_type: str = "invoice"
    line_items: Optional[List[dict]] = None


class InvoiceRead(SQLModel):
    id: int
    company_id: int
    customer_id: int
    project_id: Optional[int]
    quote_id: Optional[int]
    reference: str
    status: InvoiceStatus
    description: Optional[str]
    invoice_date: date
    due_date: date
    paid_date: Optional[date]
    amount_paid: Optional[Decimal]
    notes: Optional[str]
    invoice_type: str
    total_ht: Optional[Decimal] = None
    total_tva: Optional[Decimal] = None
    total_ttc: Optional[Decimal] = None
    remaining_amount: Optional[Decimal] = None
    created_at: datetime
    customer: Optional[dict] = None
    line_items: Optional[List[dict]] = None


class InvoiceUpdate(SQLModel):
    customer_id: Optional[int] = None
    project_id: Optional[int] = None
    status: Optional[InvoiceStatus] = None
    description: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    bank_details: Optional[str] = None
    line_items: Optional[List[dict]] = None


class PaymentCreate(SQLModel):
    amount: Decimal
    payment_date: Optional[date] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None