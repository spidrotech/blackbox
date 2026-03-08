from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import Column, Text

if TYPE_CHECKING:
    from .user import User


class Company(SQLModel, table=True):
    __tablename__ = "companies"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255, index=True)
    siret: Optional[str] = Field(default=None, max_length=20)
    address: Optional[str] = Field(default=None, max_length=255)
    city: Optional[str] = Field(default=None, max_length=100)
    postal_code: Optional[str] = Field(default=None, max_length=10)
    country: Optional[str] = Field(default="France", max_length=100)
    phone: Optional[str] = Field(default=None, max_length=20)
    email: Optional[str] = Field(default=None, max_length=180)
    website: Optional[str] = Field(default=None, max_length=255)
    logo_url: Optional[str] = Field(default=None, max_length=500)
    # Document and visual settings
    header_text: Optional[str] = Field(default=None)
    footer_text: Optional[str] = Field(default=None)
    visuals_json: Optional[str] = Field(default=None)
    labels_json: Optional[str] = Field(default=None)
    quote_defaults_json: Optional[str] = Field(default=None)
    invoice_defaults_json: Optional[str] = Field(default=None)
    cgv_url: Optional[str] = Field(default=None, max_length=500)
    
    # Informations bancaires
    iban: Optional[str] = Field(default=None, max_length=34)
    bic: Optional[str] = Field(default=None, max_length=11)
    
    # TVA
    vat_number: Optional[str] = Field(default=None, max_length=20)
    vat_subject: Optional[bool] = Field(default=True)  # False = non assujetti
    vat_collection_type: Optional[str] = Field(default=None, max_length=20)  # debit/encaissement

    # Informations juridiques
    rcs_city: Optional[str] = Field(default=None, max_length=100)
    rm_number: Optional[str] = Field(default=None, max_length=50)
    capital: Optional[float] = Field(default=None)
    ape_code: Optional[str] = Field(default=None, max_length=10)

    # Garantie & Assurance
    guarantee_type: Optional[str] = Field(default=None, max_length=20)  # biennale/decennale/rc
    insurance_name: Optional[str] = Field(default=None, max_length=255)
    insurance_coverage: Optional[str] = Field(default=None, max_length=255)
    insurance_address: Optional[str] = Field(default=None, max_length=255)
    insurance_zipcode: Optional[str] = Field(default=None, max_length=10)
    insurance_city: Optional[str] = Field(default=None, max_length=100)
    
    # Paramètres de facturation
    invoice_prefix: str = Field(default="FA")
    quote_prefix: str = Field(default="DE")
    next_invoice_number: int = Field(default=1)
    next_quote_number: int = Field(default=1)
    
    # Mentions légales par défaut
    default_payment_terms: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    default_conditions: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    legal_mentions: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    
    owner_id: Optional[int] = Field(default=None, foreign_key="users.id")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)

    # Relations - Retirée pour éviter l'ambiguïté avec les foreign keys
    # Accès via User.company_id à la place
    # members: List["User"] = Relationship(back_populates="company")
