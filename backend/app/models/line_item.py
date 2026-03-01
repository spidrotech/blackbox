from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, String
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from decimal import Decimal

from .enums import LineItemType

if TYPE_CHECKING:
    from .quote import Quote
    from .invoice import Invoice


class LineItem(SQLModel, table=True):
    __tablename__ = "line_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    
    quote_id: Optional[int] = Field(default=None, foreign_key="quotes.id")
    invoice_id: Optional[int] = Field(default=None, foreign_key="invoices.id")
    
    description: str = Field(max_length=255)
    long_description: Optional[str] = Field(default=None)
    
    item_type: LineItemType = Field(
        default=LineItemType.SUPPLY,
        sa_column=Column(String(50), nullable=False, default=LineItemType.SUPPLY.value),
    )
    
    quantity: Decimal = Field(max_digits=10, decimal_places=2)
    unit: str = Field(default="u", max_length=50)  # u, m², m³, h, jour, forfait
    unit_price: Decimal = Field(max_digits=10, decimal_places=2)
    
    # Remises
    discount: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    discount_percent: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)
    
    # TVA
    tax_rate: Decimal = Field(default=Decimal("20.00"), max_digits=5, decimal_places=2)
    
    # Infos produit
    reference: Optional[str] = Field(default=None, max_length=100)
    brand: Optional[str] = Field(default=None, max_length=100)
    model: Optional[str] = Field(default=None, max_length=100)
    
    notes: Optional[str] = Field(default=None)
    
    # Regroupement par section/lot (ex: "1. Gros œuvre")
    section: Optional[str] = Field(default=None, max_length=255)
    
    display_order: int = Field(default=0)

    # Relations
    quote: Optional["Quote"] = Relationship(back_populates="line_items")
    invoice: Optional["Invoice"] = Relationship(back_populates="line_items")

    @property
    def subtotal(self) -> Decimal:
        """Sous-total avant remise"""
        return self.quantity * self.unit_price

    @property
    def total_ht(self) -> Decimal:
        """Total HT après remise"""
        total = self.subtotal
        if self.discount:
            total -= self.discount
        elif self.discount_percent:
            total -= total * self.discount_percent / 100
        return total

    @property
    def total_tva(self) -> Decimal:
        """Montant TVA"""
        return self.total_ht * self.tax_rate / 100

    @property
    def total_ttc(self) -> Decimal:
        """Total TTC"""
        return self.total_ht + self.total_tva


class LineItemCreate(SQLModel):
    description: str
    long_description: Optional[str] = None
    item_type: LineItemType = LineItemType.SUPPLY
    quantity: Decimal
    unit: str = "u"
    unit_price: Decimal
    discount: Optional[Decimal] = None
    discount_percent: Optional[Decimal] = None
    tax_rate: Decimal = Decimal("20.00")
    reference: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    notes: Optional[str] = None
    section: Optional[str] = None
    display_order: int = 0


class LineItemRead(SQLModel):
    id: int
    description: str
    long_description: Optional[str]
    item_type: LineItemType
    quantity: Decimal
    unit: str
    unit_price: Decimal
    discount: Optional[Decimal]
    discount_percent: Optional[Decimal]
    tax_rate: Decimal
    reference: Optional[str]
    brand: Optional[str]
    model: Optional[str]
    notes: Optional[str]
    section: Optional[str]
    display_order: int
    subtotal: Optional[Decimal] = None
    total_ht: Optional[Decimal] = None
    total_tva: Optional[Decimal] = None
    total_ttc: Optional[Decimal] = None
