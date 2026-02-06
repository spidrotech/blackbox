from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from decimal import Decimal

if TYPE_CHECKING:
    from .customer import Customer
    from .project import Project
    from .supplier import Supplier


class Address(SQLModel, table=True):
    __tablename__ = "addresses"

    id: Optional[int] = Field(default=None, primary_key=True)
    street: str = Field(max_length=255)
    number: Optional[str] = Field(default=None, max_length=10)
    complement: Optional[str] = Field(default=None, max_length=255)
    city: str = Field(max_length=255)
    postal_code: str = Field(max_length=10)
    country: str = Field(default="France", max_length=100)
    latitude: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=8)
    longitude: Optional[Decimal] = Field(default=None, max_digits=11, decimal_places=8)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)

    def __str__(self) -> str:
        parts = []
        if self.number:
            parts.append(self.number)
        parts.append(self.street)
        return f"{' '.join(parts)}, {self.postal_code} {self.city}"
