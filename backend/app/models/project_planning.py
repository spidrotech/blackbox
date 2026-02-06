from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import JSON

from .enums import ProjectPriority

if TYPE_CHECKING:
    from .project import Project


class ProjectPlanning(SQLModel, table=True):
    """Modèle pour la gestion des tâches/phases d'un projet (chantier)"""
    __tablename__ = "project_plannings"

    id: Optional[int] = Field(default=None, primary_key=True)
    
    project_id: int = Field(foreign_key="projects.id", index=True)
    parent_task_id: Optional[int] = Field(default=None, foreign_key="project_plannings.id")
    
    name: str = Field(max_length=255)
    description: Optional[str] = Field(default=None)
    
    # Dates planifiées vs réelles
    planned_start_date: date
    planned_end_date: date
    actual_start_date: Optional[date] = Field(default=None)
    actual_end_date: Optional[date] = Field(default=None)
    
    # Heures et coûts estimés
    estimated_hours: Decimal = Field(max_digits=8, decimal_places=2)
    actual_hours: Decimal = Field(default=0, max_digits=8, decimal_places=2)
    estimated_cost: Decimal = Field(max_digits=12, decimal_places=2)
    actual_cost: Decimal = Field(default=0, max_digits=12, decimal_places=2)
    
    # Suivi
    progress_percentage: int = Field(default=0, ge=0, le=100)
    status: str = Field(default="pending", max_length=20)  # pending, in_progress, completed, on_hold, cancelled
    priority: str = Field(default="medium", max_length=20)
    
    # Visuel
    color: Optional[str] = Field(default=None, max_length=100)
    sort_order: int = Field(default=0)
    is_milestone: bool = Field(default=False)
    
    # Relations
    dependencies: Optional[str] = Field(default=None)  # JSON array of task IDs
    assigned_user_ids: Optional[str] = Field(default=None)  # JSON array of user IDs
    
    notes: Optional[str] = Field(default=None)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)

    # Relations
    project: Optional["Project"] = Relationship(back_populates="plannings")
    subtasks: List["ProjectPlanning"] = Relationship(
        back_populates="parent_task",
        sa_relationship_kwargs={"remote_side": "ProjectPlanning.id", "foreign_keys": "[ProjectPlanning.parent_task_id]"}
    )
    parent_task: Optional["ProjectPlanning"] = Relationship(
        back_populates="subtasks",
        sa_relationship_kwargs={"remote_side": "[ProjectPlanning.parent_task_id]"}
    )


class ProjectPlanningCreate(SQLModel):
    project_id: int
    parent_task_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    planned_start_date: date
    planned_end_date: date
    estimated_hours: Decimal
    estimated_cost: Decimal
    progress_percentage: int = 0
    status: str = "pending"
    priority: str = "medium"
    color: Optional[str] = None
    sort_order: int = 0
    is_milestone: bool = False
    dependencies: Optional[List[int]] = None
    assigned_user_ids: Optional[List[int]] = None
    notes: Optional[str] = None


class ProjectPlanningRead(SQLModel):
    id: int
    project_id: int
    parent_task_id: Optional[int]
    name: str
    description: Optional[str]
    planned_start_date: date
    planned_end_date: date
    actual_start_date: Optional[date]
    actual_end_date: Optional[date]
    estimated_hours: Decimal
    actual_hours: Decimal
    estimated_cost: Decimal
    actual_cost: Decimal
    progress_percentage: int
    status: str
    priority: str
    color: Optional[str]
    sort_order: int
    is_milestone: bool
    dependencies: Optional[List[int]] = None
    assigned_user_ids: Optional[List[int]] = None
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]


class ProjectPlanningUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    estimated_hours: Optional[Decimal] = None
    actual_hours: Optional[Decimal] = None
    estimated_cost: Optional[Decimal] = None
    actual_cost: Optional[Decimal] = None
    progress_percentage: Optional[int] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    color: Optional[str] = None
    sort_order: Optional[int] = None
    is_milestone: Optional[bool] = None
    dependencies: Optional[List[int]] = None
    assigned_user_ids: Optional[List[int]] = None
    notes: Optional[str] = None
