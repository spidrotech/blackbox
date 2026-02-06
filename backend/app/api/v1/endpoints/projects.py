from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime

from app.db.session import get_session
from app.models import (
    Project, ProjectCreate, ProjectRead, ProjectUpdate,
    Customer, Address, User
)
from app.core.security import get_current_user_required

router = APIRouter()


def get_project_response(project: Project, session: Session) -> dict:
    """Formatte la réponse projet"""
    customer = None
    if project.customer_id:
        cust = session.get(Customer, project.customer_id)
        if cust:
            customer = {"id": cust.id, "name": cust.name}
    
    worksite = None
    if project.worksite_id:
        addr = session.get(Address, project.worksite_id)
        if addr:
            worksite = {
                "street": addr.street,
                "city": addr.city,
                "postalCode": addr.postal_code,
                "country": addr.country,
            }
    
    return {
        "id": project.id,
        "companyId": project.company_id,
        "customerId": project.customer_id,
        "name": project.name,
        "description": project.description,
        "status": project.status.value if project.status else "draft",
        "priority": project.priority.value if project.priority else "medium",
        "startDate": project.start_date.isoformat() if project.start_date else None,
        "endDate": project.end_date.isoformat() if project.end_date else None,
        "estimatedBudget": float(project.estimated_budget) if project.estimated_budget else None,
        "actualCost": float(project.actual_cost) if project.actual_cost else None,
        "notes": project.notes,
        "createdAt": project.created_at.isoformat(),
        "customer": customer,
        "worksite": worksite,
    }


@router.get("/", response_model=dict)
def list_projects(
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste tous les projets de l'entreprise"""
    statement = select(Project).where(Project.company_id == current_user.company_id)
    
    if status:
        statement = statement.where(Project.status == status)
    
    if customer_id:
        statement = statement.where(Project.customer_id == customer_id)
    
    if search:
        statement = statement.where(Project.name.ilike(f"%{search}%"))
    
    statement = statement.offset(skip).limit(limit)
    projects = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [get_project_response(p, session) for p in projects],
        "items": [get_project_response(p, session) for p in projects],
        "meta": {"total": len(projects)}
    }


@router.get("/{project_id}", response_model=dict)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Récupère un projet par son ID"""
    project = session.get(Project, project_id)
    if not project or project.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    return {
        "success": True,
        "project": get_project_response(project, session)
    }


@router.post("/", response_model=dict)
def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Crée un nouveau projet"""
    # Vérifier que le client existe
    customer = session.get(Customer, project_data.customer_id)
    if not customer or customer.company_id != current_user.company_id:
        raise HTTPException(status_code=400, detail="Client non trouvé")
    
    # Créer l'adresse du chantier si fournie
    worksite_id = None
    if project_data.worksite:
        addr = project_data.worksite
        address = Address(
            street=addr.get("street", ""),
            city=addr.get("city", ""),
            postal_code=addr.get("postalCode", ""),
            country=addr.get("country", "France"),
        )
        session.add(address)
        session.commit()
        session.refresh(address)
        worksite_id = address.id
    
    project = Project(
        company_id=current_user.company_id,
        customer_id=project_data.customer_id,
        name=project_data.name,
        description=project_data.description,
        status=project_data.status,
        priority=project_data.priority,
        start_date=project_data.start_date,
        end_date=project_data.end_date,
        estimated_budget=project_data.estimated_budget,
        project_manager_id=project_data.project_manager_id,
        notes=project_data.notes,
        worksite_id=worksite_id,
    )
    session.add(project)
    session.commit()
    session.refresh(project)
    
    return {
        "success": True,
        "project": get_project_response(project, session)
    }


@router.put("/{project_id}", response_model=dict)
def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Met à jour un projet"""
    project = session.get(Project, project_id)
    if not project or project.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    update_data = project_data.model_dump(exclude_unset=True)
    
    # Gérer l'adresse du chantier
    if "worksite" in update_data:
        addr_data = update_data.pop("worksite")
        if addr_data:
            if project.worksite_id:
                address = session.get(Address, project.worksite_id)
                if address:
                    address.street = addr_data.get("street", address.street)
                    address.city = addr_data.get("city", address.city)
                    address.postal_code = addr_data.get("postalCode", address.postal_code)
                    address.country = addr_data.get("country", address.country)
                    session.add(address)
            else:
                address = Address(
                    street=addr_data.get("street", ""),
                    city=addr_data.get("city", ""),
                    postal_code=addr_data.get("postalCode", ""),
                    country=addr_data.get("country", "France"),
                )
                session.add(address)
                session.commit()
                session.refresh(address)
                project.worksite_id = address.id
    
    for key, value in update_data.items():
        setattr(project, key, value)
    
    project.updated_at = datetime.utcnow()
    session.add(project)
    session.commit()
    session.refresh(project)
    
    return {
        "success": True,
        "project": get_project_response(project, session)
    }


@router.delete("/{project_id}", response_model=dict)
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Supprime un projet"""
    project = session.get(Project, project_id)
    if not project or project.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    session.delete(project)
    session.commit()
    
    return {"success": True, "message": "Projet supprimé"}