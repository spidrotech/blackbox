from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import date, time, datetime
from decimal import Decimal

from .enums import TimeEntryType, TimeEntryStatus

if TYPE_CHECKING:
    from .user import User
    from .project import Project
    from .company import Company


class TimeEntry(SQLModel, table=True):
    __tablename__ = "time_entries"

    id: Optional[int] = Field(default=None, primary_key=True)
    
    user_id: int = Field(foreign_key="users.id", index=True)
    project_id: int = Field(foreign_key="projects.id", index=True)
    company_id: int = Field(foreign_key="companies.id", index=True)
    
    work_date: date
    start_time: time
    end_time: Optional[time] = Field(default=None)
    
    duration: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)  # En heures
    break_duration: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=2)  # Pause en heures
    
    type: TimeEntryType = Field(default=TimeEntryType.WORK)
    status: TimeEntryStatus = Field(default=TimeEntryStatus.PENDING)
    
    description: Optional[str] = Field(default=None)
    task: Optional[str] = Field(default=None)
    
    hourly_rate: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    total_cost: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    
    location: Optional[str] = Field(default=None)  # {lat, lng} as JSON string
    
    approved_by_id: Optional[int] = Field(default=None, foreign_key="users.id")
    approved_at: Optional[datetime] = Field(default=None)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)

    # Relations
    project: Optional["Project"] = Relationship(back_populates="time_entries")

    def calculate_duration_and_cost(self) -> None:
        """Calcule la durée et le coût"""
        if self.start_time and self.end_time:
            start = datetime.combine(date.today(), self.start_time)
            end = datetime.combine(date.today(), self.end_time)
            diff = (end - start).seconds / 3600  # En heures
            
            break_hours = float(self.break_duration) if self.break_duration else 0
            self.duration = Decimal(str(max(0, diff - break_hours)))
        
        if self.duration and self.hourly_rate:
            self.total_cost = self.duration * self.hourly_rate


class TimeEntryCreate(SQLModel):
    project_id: int
    work_date: date
    start_time: time
    end_time: Optional[time] = None
    duration: Optional[Decimal] = None
    break_duration: Optional[Decimal] = None
    type: TimeEntryType = TimeEntryType.WORK
    description: Optional[str] = None
    task: Optional[str] = None
    hourly_rate: Optional[Decimal] = None
    location: Optional[dict] = None


class TimeEntryRead(SQLModel):
    id: int
    user_id: int
    project_id: int
    company_id: int
    work_date: date
    start_time: time
    end_time: Optional[time]
    duration: Optional[Decimal]
    break_duration: Optional[Decimal]
    type: TimeEntryType
    status: TimeEntryStatus
    description: Optional[str]
    task: Optional[str]
    hourly_rate: Optional[Decimal]
    total_cost: Optional[Decimal]
    location: Optional[dict]
    approved_by_id: Optional[int]
    approved_at: Optional[datetime]
    created_at: datetime
    project: Optional[dict] = None
    user: Optional[dict] = None


class TimeEntryUpdate(SQLModel):
    project_id: Optional[int] = None
    work_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    duration: Optional[Decimal] = None
    break_duration: Optional[Decimal] = None
    type: Optional[TimeEntryType] = None
    description: Optional[str] = None
    task: Optional[str] = None
    hourly_rate: Optional[Decimal] = None
    location: Optional[dict] = None
