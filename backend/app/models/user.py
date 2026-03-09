
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import Column, JSON

from .enums import UserRole

if TYPE_CHECKING:
    from .company import Company
    from .project_team import ProjectTeam


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(max_length=180, unique=True, index=True)
    password: str = Field(max_length=255)
    
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=20)
    
    roles: List[str] = Field(default=["ROLE_USER"], sa_column=Column(JSON))
    
    company_id: Optional[int] = Field(default=None, foreign_key="companies.id")
    # Relation vers Company retirée pour éviter l'ambiguïté
    # company: Optional["Company"] = Relationship(back_populates="members")
    
    # Abonnement
    subscription_id: Optional[int] = Field(default=None)
    
    is_active: bool = Field(default=True)

    # Password reset
    reset_token: Optional[str] = Field(default=None, max_length=255)
    reset_token_expires: Optional[datetime] = Field(default=None)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)
    
    # Relations aux projets
    project_assignments: List["ProjectTeam"] = Relationship(back_populates="user")

    @property
    def full_name(self) -> str:
        parts = []
        if self.first_name:
            parts.append(self.first_name)
        if self.last_name:
            parts.append(self.last_name)
        return " ".join(parts) if parts else self.email


class UserCreate(SQLModel):
    email: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None


class UserRead(SQLModel):
    id: int
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    phone: Optional[str]
    roles: List[str]
    company_id: Optional[int]
    is_active: bool
    created_at: datetime


class UserUpdate(SQLModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None


class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(SQLModel):
    user_id: Optional[int] = None


class LoginRequest(SQLModel):
    """Modèle pour la requête de connexion"""
    email: str
    password: str

class UserMeResponse(SQLModel):
    """Réponse du endpoint GET /me"""
    success: bool
    user: dict