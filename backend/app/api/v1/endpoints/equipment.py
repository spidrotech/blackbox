from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal

from app.db.session import get_session
from app.models import (
    Equipment, EquipmentCreate, EquipmentUpdate, EquipmentUsage,
    Project, Supplier, User
)
from app.models.enums import EquipmentStatus
from app.core.security import get_current_user_required

router = APIRouter()


def get_equipment_response(equipment: Equipment, session: Session) -> dict:
    """Formatte la réponse équipement"""
    current_project = None
    if equipment.current_project_id:
        proj = session.get(Project, equipment.current_project_id)
        if proj:
            current_project = {"id": proj.id, "name": proj.name}
    
    rental_supplier = None
    if equipment.rental_supplier_id:
        sup = session.get(Supplier, equipment.rental_supplier_id)
        if sup:
            rental_supplier = {"id": sup.id, "name": sup.name}
    
    return {
        "id": equipment.id,
        "companyId": equipment.company_id,
        "name": equipment.name,
        "code": equipment.code,
        "serialNumber": equipment.serial_number,
        "brand": equipment.brand,
        "model": equipment.model,
        "category": equipment.category,
        "ownershipType": equipment.ownership_type.value,
        "status": equipment.status.value,
        "purchaseDate": equipment.purchase_date.isoformat() if equipment.purchase_date else None,
        "purchasePrice": float(equipment.purchase_price) if equipment.purchase_price else None,
        "hourlyRate": float(equipment.hourly_rate) if equipment.hourly_rate else None,
        "dailyRate": float(equipment.daily_rate) if equipment.daily_rate else None,
        "rentalSupplierId": equipment.rental_supplier_id,
        "rentalStartDate": equipment.rental_start_date.isoformat() if equipment.rental_start_date else None,
        "rentalEndDate": equipment.rental_end_date.isoformat() if equipment.rental_end_date else None,
        "lastMaintenanceDate": equipment.last_maintenance_date.isoformat() if equipment.last_maintenance_date else None,
        "nextMaintenanceDate": equipment.next_maintenance_date.isoformat() if equipment.next_maintenance_date else None,
        "totalHoursUsed": float(equipment.total_hours_used),
        "currentProjectId": equipment.current_project_id,
        "photos": equipment.photos,
        "notes": equipment.notes,
        "createdAt": equipment.created_at.isoformat(),
        "currentProject": current_project,
        "rentalSupplier": rental_supplier,
    }


@router.get("/", response_model=dict)
def list_equipment(
    status: Optional[str] = None,
    category: Optional[str] = None,
    project_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste tous les équipements"""
    statement = select(Equipment).where(Equipment.company_id == current_user.company_id)
    
    if status:
        statement = statement.where(Equipment.status == status)
    
    if category:
        statement = statement.where(Equipment.category == category)
    
    if project_id:
        statement = statement.where(Equipment.current_project_id == project_id)
    
    statement = statement.offset(skip).limit(limit)
    equipment_list = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [get_equipment_response(e, session) for e in equipment_list],
        "meta": {"total": len(equipment_list)}
    }


@router.get("/available", response_model=dict)
def list_available(
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste les équipements disponibles"""
    statement = select(Equipment).where(
        Equipment.company_id == current_user.company_id,
        Equipment.status == EquipmentStatus.AVAILABLE
    )
    equipment_list = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [get_equipment_response(e, session) for e in equipment_list]
    }


@router.get("/needs-maintenance", response_model=dict)
def needs_maintenance(
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste les équipements nécessitant maintenance"""
    today = date.today()
    statement = select(Equipment).where(
        Equipment.company_id == current_user.company_id,
        Equipment.next_maintenance_date <= today
    )
    equipment_list = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [get_equipment_response(e, session) for e in equipment_list]
    }


@router.get("/categories", response_model=dict)
def list_categories(
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste les catégories d'équipements"""
    statement = select(Equipment.category).where(
        Equipment.company_id == current_user.company_id,
        Equipment.category != None
    ).distinct()
    categories = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [c for c in categories if c]
    }


@router.get("/{equipment_id}", response_model=dict)
def get_equipment(
    equipment_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Récupère un équipement par son ID"""
    equipment = session.get(Equipment, equipment_id)
    if not equipment or equipment.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    
    return {
        "success": True,
        "data": get_equipment_response(equipment, session)
    }


@router.post("/", response_model=dict)
def create_equipment(
    equipment_data: EquipmentCreate,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Crée un nouvel équipement"""
    equipment = Equipment(
        company_id=current_user.company_id,
        name=equipment_data.name,
        code=equipment_data.code,
        serial_number=equipment_data.serial_number,
        brand=equipment_data.brand,
        model=equipment_data.model,
        category=equipment_data.category,
        ownership_type=equipment_data.ownership_type,
        status=equipment_data.status,
        purchase_date=equipment_data.purchase_date,
        purchase_price=equipment_data.purchase_price,
        hourly_rate=equipment_data.hourly_rate,
        daily_rate=equipment_data.daily_rate,
        rental_supplier_id=equipment_data.rental_supplier_id,
        rental_start_date=equipment_data.rental_start_date,
        rental_end_date=equipment_data.rental_end_date,
        next_maintenance_date=equipment_data.next_maintenance_date,
        notes=equipment_data.notes,
    )
    session.add(equipment)
    session.commit()
    session.refresh(equipment)
    
    return {
        "success": True,
        "data": get_equipment_response(equipment, session)
    }


@router.put("/{equipment_id}", response_model=dict)
def update_equipment(
    equipment_id: int,
    equipment_data: EquipmentUpdate,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Met à jour un équipement"""
    equipment = session.get(Equipment, equipment_id)
    if not equipment or equipment.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    
    update_data = equipment_data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(equipment, key, value)
    
    equipment.updated_at = datetime.utcnow()
    session.add(equipment)
    session.commit()
    session.refresh(equipment)
    
    return {
        "success": True,
        "data": get_equipment_response(equipment, session)
    }


@router.post("/{equipment_id}/assign", response_model=dict)
def assign_to_project(
    equipment_id: int,
    data: dict,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Assigne un équipement à un projet"""
    equipment = session.get(Equipment, equipment_id)
    if not equipment or equipment.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    
    project_id = data.get("project")
    if project_id:
        project = session.get(Project, project_id)
        if not project or project.company_id != current_user.company_id:
            raise HTTPException(status_code=400, detail="Projet non trouvé")
    
    equipment.current_project_id = project_id
    equipment.status = EquipmentStatus.IN_USE
    equipment.updated_at = datetime.utcnow()
    
    # Créer un usage
    if project_id:
        usage = EquipmentUsage(
            equipment_id=equipment.id,
            project_id=project_id,
            user_id=current_user.id,
            start_date=date.today(),
        )
        session.add(usage)
    
    session.add(equipment)
    session.commit()
    session.refresh(equipment)
    
    return {
        "success": True,
        "data": get_equipment_response(equipment, session)
    }


@router.post("/{equipment_id}/release", response_model=dict)
def release_from_project(
    equipment_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Libère un équipement d'un projet"""
    equipment = session.get(Equipment, equipment_id)
    if not equipment or equipment.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    
    # Fermer l'usage en cours
    if equipment.current_project_id:
        statement = select(EquipmentUsage).where(
            EquipmentUsage.equipment_id == equipment.id,
            EquipmentUsage.end_date == None
        )
        usage = session.exec(statement).first()
        if usage:
            usage.end_date = date.today()
            session.add(usage)
    
    equipment.current_project_id = None
    equipment.status = EquipmentStatus.AVAILABLE
    equipment.updated_at = datetime.utcnow()
    
    session.add(equipment)
    session.commit()
    session.refresh(equipment)
    
    return {
        "success": True,
        "data": get_equipment_response(equipment, session)
    }


@router.post("/{equipment_id}/usage", response_model=dict)
def log_usage(
    equipment_id: int,
    usage_data: dict,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Enregistre une utilisation"""
    equipment = session.get(Equipment, equipment_id)
    if not equipment or equipment.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    
    hours = Decimal(str(usage_data.get("hours", 0)))
    equipment.total_hours_used = equipment.total_hours_used + hours
    equipment.updated_at = datetime.utcnow()
    
    session.add(equipment)
    session.commit()
    session.refresh(equipment)
    
    return {
        "success": True,
        "data": get_equipment_response(equipment, session)
    }


@router.delete("/{equipment_id}", response_model=dict)
def delete_equipment(
    equipment_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Supprime un équipement"""
    equipment = session.get(Equipment, equipment_id)
    if not equipment or equipment.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    
    session.delete(equipment)
    session.commit()
    
    return {"success": True, "message": "Équipement supprimé"}
