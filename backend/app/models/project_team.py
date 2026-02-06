from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from .project import Project
    from .user import User


class ProjectTeam(SQLModel, table=True):
    """Modèle pour l'assignation des utilisateurs aux projets"""
    __tablename__ = "project_team"

    project_id: int = Field(foreign_key="projects.id", primary_key=True)
    user_id: int = Field(foreign_key="users.id", primary_key=True)
    
    role: Optional[str] = Field(default="team_member", max_length=50)  # team_member, supervisor, project_manager, etc.
    
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relations
    project: Optional["Project"] = Relationship(back_populates="team_members")
    user: Optional["User"] = Relationship(back_populates="project_assignments")
