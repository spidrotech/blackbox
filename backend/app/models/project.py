from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import date, datetime
from decimal import Decimal

from .enums import ProjectStatus, ProjectPriority

if TYPE_CHECKING:
    from .company import Company
    from .customer import Customer
    from .address import Address
    from .invoice import Invoice
    from .quote import Quote
    from .time_entry import TimeEntry
    from .purchase import Purchase
    from .equipment import Equipment
    from .project_planning import ProjectPlanning
    from .project_team import ProjectTeam


class Project(SQLModel, table=True):
    __tablename__ = "projects"

    id: Optional[int] = Field(default=None, primary_key=True)
    
    company_id: int = Field(foreign_key="companies.id", index=True)
    customer_id: int = Field(foreign_key="customers.id", index=True)
    
    name: str = Field(max_length=255, index=True)
    description: Optional[str] = Field(default=None)
    
    worksite_id: Optional[int] = Field(default=None, foreign_key="addresses.id")
    
    status: ProjectStatus = Field(default=ProjectStatus.DRAFT, index=True)
    priority: ProjectPriority = Field(default=ProjectPriority.MEDIUM)
    
    start_date: Optional[date] = Field(default=None)
    end_date: Optional[date] = Field(default=None)
    
    estimated_budget: Optional[Decimal] = Field(default=None, max_digits=12, decimal_places=2)
    actual_cost: Optional[Decimal] = Field(default=None, max_digits=12, decimal_places=2)
    
    project_manager_id: Optional[int] = Field(default=None, foreign_key="users.id")
    
    notes: Optional[str] = Field(default=None)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)

    # Relations
    # customer: Optional["Customer"] = Relationship()  # Causait des erreurs
    invoices: List["Invoice"] = Relationship(back_populates="project")
    quotes: List["Quote"] = Relationship(back_populates="project")
    time_entries: List["TimeEntry"] = Relationship(back_populates="project")
    purchases: List["Purchase"] = Relationship(back_populates="project")
    plannings: List["ProjectPlanning"] = Relationship(back_populates="project", cascade_delete=True)
    team_members: List["ProjectTeam"] = Relationship(back_populates="project", cascade_delete=True)


class ProjectCreate(SQLModel):
    name: str
    customer_id: int
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.DRAFT
    priority: ProjectPriority = ProjectPriority.MEDIUM
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    estimated_budget: Optional[Decimal] = None
    project_manager_id: Optional[int] = None
    notes: Optional[str] = None
    worksite: Optional[dict] = None


class ProjectRead(SQLModel):
    id: int
    company_id: int
    customer_id: int
    name: str
    description: Optional[str]
    status: ProjectStatus
    priority: ProjectPriority
    start_date: Optional[date]
    end_date: Optional[date]
    estimated_budget: Optional[Decimal]
    actual_cost: Optional[Decimal]
    project_manager_id: Optional[int]
    notes: Optional[str]
    created_at: datetime
    customer: Optional[dict] = None
    worksite: Optional[dict] = None


class ProjectUpdate(SQLModel):
    name: Optional[str] = None
    customer_id: Optional[int] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    priority: Optional[ProjectPriority] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    estimated_budget: Optional[Decimal] = None
    project_manager_id: Optional[int] = None
    notes: Optional[str] = None
    worksite: Optional[dict] = None