from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime, date, time
from decimal import Decimal

from app.db.session import get_session
from app.models import (
    TimeEntry, TimeEntryCreate, TimeEntryUpdate,
    Project, User
)
from app.models.enums import TimeEntryStatus
from app.core.security import get_current_user_required

router = APIRouter()


def get_time_entry_response(entry: TimeEntry, session: Session) -> dict:
    """Formatte la réponse pointage"""
    project = None
    if entry.project_id:
        proj = session.get(Project, entry.project_id)
        if proj:
            project = {"id": proj.id, "name": proj.name}
    
    user = None
    if entry.user_id:
        u = session.get(User, entry.user_id)
        if u:
            user = {"id": u.id, "name": u.full_name, "email": u.email}
    
    return {
        "id": entry.id,
        "userId": entry.user_id,
        "projectId": entry.project_id,
        "companyId": entry.company_id,
        "workDate": entry.work_date.isoformat() if entry.work_date else None,
        "startTime": entry.start_time.isoformat() if entry.start_time else None,
        "endTime": entry.end_time.isoformat() if entry.end_time else None,
        "duration": float(entry.duration) if entry.duration else None,
        "breakDuration": float(entry.break_duration) if entry.break_duration else None,
        "type": entry.type.value,
        "status": entry.status.value,
        "description": entry.description,
        "task": entry.task,
        "hourlyRate": float(entry.hourly_rate) if entry.hourly_rate else None,
        "totalCost": float(entry.total_cost) if entry.total_cost else None,
        "location": entry.location,
        "approvedById": entry.approved_by_id,
        "approvedAt": entry.approved_at.isoformat() if entry.approved_at else None,
        "createdAt": entry.created_at.isoformat(),
        "project": project,
        "user": user,
    }


@router.get("/", response_model=dict)
def list_time_entries(
    project_id: Optional[int] = None,
    user_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste tous les pointages"""
    statement = select(TimeEntry).where(TimeEntry.company_id == current_user.company_id)
    
    if project_id:
        statement = statement.where(TimeEntry.project_id == project_id)
    
    if user_id:
        statement = statement.where(TimeEntry.user_id == user_id)
    
    if status:
        statement = statement.where(TimeEntry.status == status)
    
    if start_date:
        statement = statement.where(TimeEntry.work_date >= start_date)
    
    if end_date:
        statement = statement.where(TimeEntry.work_date <= end_date)
    
    statement = statement.order_by(TimeEntry.work_date.desc()).offset(skip).limit(limit)
    entries = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [get_time_entry_response(e, session) for e in entries],
        "meta": {"total": len(entries)}
    }


@router.get("/pending", response_model=dict)
def list_pending(
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste les pointages en attente de validation"""
    statement = select(TimeEntry).where(
        TimeEntry.company_id == current_user.company_id,
        TimeEntry.status == TimeEntryStatus.PENDING
    ).order_by(TimeEntry.work_date.desc())
    entries = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [get_time_entry_response(e, session) for e in entries]
    }


@router.get("/stats/monthly", response_model=dict)
def monthly_stats(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Statistiques mensuelles"""
    from calendar import monthrange
    
    start = date(year, month, 1)
    _, last_day = monthrange(year, month)
    end = date(year, month, last_day)
    
    statement = select(TimeEntry).where(
        TimeEntry.company_id == current_user.company_id,
        TimeEntry.work_date >= start,
        TimeEntry.work_date <= end
    )
    entries = session.exec(statement).all()
    
    total_hours = sum(float(e.duration or 0) for e in entries)
    total_cost = sum(float(e.total_cost or 0) for e in entries)
    
    by_project = {}
    for e in entries:
        pid = e.project_id
        if pid not in by_project:
            by_project[pid] = {"hours": 0, "cost": 0}
        by_project[pid]["hours"] += float(e.duration or 0)
        by_project[pid]["cost"] += float(e.total_cost or 0)
    
    return {
        "success": True,
        "data": {
            "year": year,
            "month": month,
            "totalHours": total_hours,
            "totalCost": total_cost,
            "count": len(entries),
            "byProject": by_project,
        }
    }


@router.get("/{entry_id}", response_model=dict)
def get_time_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Récupère un pointage par son ID"""
    entry = session.get(TimeEntry, entry_id)
    if not entry or entry.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Pointage non trouvé")
    
    return {
        "success": True,
        "data": get_time_entry_response(entry, session)
    }


@router.post("/", response_model=dict)
def create_time_entry(
    entry_data: TimeEntryCreate,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Crée un nouveau pointage"""
    # Vérifier le projet
    project = session.get(Project, entry_data.project_id)
    if not project or project.company_id != current_user.company_id:
        raise HTTPException(status_code=400, detail="Projet non trouvé")
    
    entry = TimeEntry(
        user_id=current_user.id,
        project_id=entry_data.project_id,
        company_id=current_user.company_id,
        work_date=entry_data.work_date,
        start_time=entry_data.start_time,
        end_time=entry_data.end_time,
        duration=entry_data.duration,
        break_duration=entry_data.break_duration,
        type=entry_data.type,
        description=entry_data.description,
        task=entry_data.task,
        hourly_rate=entry_data.hourly_rate,
        location=entry_data.location,
        status=TimeEntryStatus.PENDING,
    )
    
    # Calculer durée et coût
    entry.calculate_duration_and_cost()
    
    session.add(entry)
    session.commit()
    session.refresh(entry)
    
    return {
        "success": True,
        "data": get_time_entry_response(entry, session)
    }


@router.put("/{entry_id}", response_model=dict)
def update_time_entry(
    entry_id: int,
    entry_data: TimeEntryUpdate,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Met à jour un pointage"""
    entry = session.get(TimeEntry, entry_id)
    if not entry or entry.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Pointage non trouvé")
    
    update_data = entry_data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(entry, key, value)
    
    entry.calculate_duration_and_cost()
    entry.updated_at = datetime.utcnow()
    session.add(entry)
    session.commit()
    session.refresh(entry)
    
    return {
        "success": True,
        "data": get_time_entry_response(entry, session)
    }


@router.post("/{entry_id}/approve", response_model=dict)
def approve_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Approuve un pointage"""
    entry = session.get(TimeEntry, entry_id)
    if not entry or entry.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Pointage non trouvé")
    
    entry.status = TimeEntryStatus.APPROVED
    entry.approved_by_id = current_user.id
    entry.approved_at = datetime.utcnow()
    entry.updated_at = datetime.utcnow()
    
    session.add(entry)
    session.commit()
    session.refresh(entry)
    
    return {
        "success": True,
        "data": get_time_entry_response(entry, session)
    }


@router.post("/{entry_id}/reject", response_model=dict)
def reject_entry(
    entry_id: int,
    reason: dict,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Rejette un pointage"""
    entry = session.get(TimeEntry, entry_id)
    if not entry or entry.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Pointage non trouvé")
    
    entry.status = TimeEntryStatus.REJECTED
    entry.updated_at = datetime.utcnow()
    
    session.add(entry)
    session.commit()
    session.refresh(entry)
    
    return {
        "success": True,
        "data": get_time_entry_response(entry, session)
    }


@router.delete("/{entry_id}", response_model=dict)
def delete_time_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Supprime un pointage"""
    entry = session.get(TimeEntry, entry_id)
    if not entry or entry.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Pointage non trouvé")
    
    session.delete(entry)
    session.commit()
    
    return {"success": True, "message": "Pointage supprimé"}
