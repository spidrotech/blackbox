from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal

from app.db.session import get_session
from app.models import (
    Purchase, PurchaseCreate, PurchaseUpdate, PurchasePayment,
    Supplier, Project, User
)
from app.models.enums import PurchaseStatus
from app.core.security import get_current_user_required

router = APIRouter()


def generate_purchase_reference() -> str:
    """Génère une référence unique pour l'achat"""
    import uuid
    year = datetime.now().year
    return f"ACH-{year}-{str(uuid.uuid4())[:6].upper()}"


def get_purchase_response(purchase: Purchase, session: Session) -> dict:
    """Formatte la réponse achat"""
    supplier = None
    if purchase.supplier_id:
        sup = session.get(Supplier, purchase.supplier_id)
        if sup:
            supplier = {"id": sup.id, "name": sup.name}
    
    project = None
    if purchase.project_id:
        proj = session.get(Project, purchase.project_id)
        if proj:
            project = {"id": proj.id, "name": proj.name}
    
    return {
        "id": purchase.id,
        "reference": purchase.reference,
        "companyId": purchase.company_id,
        "supplierId": purchase.supplier_id,
        "projectId": purchase.project_id,
        "category": purchase.category.value,
        "description": purchase.description,
        "supplierReference": purchase.supplier_reference,
        "purchaseDate": purchase.purchase_date.isoformat() if purchase.purchase_date else None,
        "dueDate": purchase.due_date.isoformat() if purchase.due_date else None,
        "paidDate": purchase.paid_date.isoformat() if purchase.paid_date else None,
        "totalHt": float(purchase.total_ht),
        "vatRate": float(purchase.vat_rate),
        "totalVat": float(purchase.total_vat) if purchase.total_vat else None,
        "totalTtc": float(purchase.total_ttc) if purchase.total_ttc else None,
        "amountPaid": float(purchase.amount_paid),
        "status": purchase.status.value,
        "paymentMethod": purchase.payment_method,
        "notes": purchase.notes,
        "isRecurring": purchase.is_recurring,
        "isGeneralExpense": purchase.is_general_expense,
        "createdAt": purchase.created_at.isoformat(),
        "supplier": supplier,
        "project": project,
    }


@router.get("/", response_model=dict)
def list_purchases(
    status: Optional[str] = None,
    category: Optional[str] = None,
    supplier_id: Optional[int] = None,
    project_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste tous les achats"""
    statement = select(Purchase).where(Purchase.company_id == current_user.company_id)
    
    if status:
        statement = statement.where(Purchase.status == status)
    
    if category:
        statement = statement.where(Purchase.category == category)
    
    if supplier_id:
        statement = statement.where(Purchase.supplier_id == supplier_id)
    
    if project_id:
        statement = statement.where(Purchase.project_id == project_id)
    
    statement = statement.order_by(Purchase.created_at.desc()).offset(skip).limit(limit)
    purchases = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [get_purchase_response(p, session) for p in purchases],
        "meta": {"total": len(purchases)}
    }


@router.get("/unpaid", response_model=dict)
def list_unpaid(
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste les achats non payés"""
    statement = select(Purchase).where(
        Purchase.company_id == current_user.company_id,
        Purchase.status.in_([PurchaseStatus.PENDING, PurchaseStatus.PARTIAL])
    ).order_by(Purchase.due_date)
    purchases = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [get_purchase_response(p, session) for p in purchases]
    }


@router.get("/overdue", response_model=dict)
def list_overdue(
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste les achats en retard"""
    today = date.today()
    statement = select(Purchase).where(
        Purchase.company_id == current_user.company_id,
        Purchase.status.in_([PurchaseStatus.PENDING, PurchaseStatus.PARTIAL]),
        Purchase.due_date < today
    ).order_by(Purchase.due_date)
    purchases = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [get_purchase_response(p, session) for p in purchases]
    }


@router.get("/stats", response_model=dict)
def get_stats(
    year: int = Query(default=None),
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Statistiques des achats"""
    if year is None:
        year = datetime.now().year
    
    statement = select(Purchase).where(Purchase.company_id == current_user.company_id)
    purchases = session.exec(statement).all()
    
    year_purchases = [p for p in purchases if p.purchase_date and p.purchase_date.year == year]
    
    total_ht = sum(float(p.total_ht) for p in year_purchases)
    total_paid = sum(float(p.amount_paid) for p in year_purchases)
    
    by_category = {}
    for p in year_purchases:
        cat = p.category.value
        if cat not in by_category:
            by_category[cat] = 0
        by_category[cat] += float(p.total_ht)
    
    return {
        "success": True,
        "data": {
            "year": year,
            "totalHt": total_ht,
            "totalPaid": total_paid,
            "count": len(year_purchases),
            "byCategory": by_category,
        }
    }


@router.get("/{purchase_id}", response_model=dict)
def get_purchase(
    purchase_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Récupère un achat par son ID"""
    purchase = session.get(Purchase, purchase_id)
    if not purchase or purchase.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Achat non trouvé")
    
    return {
        "success": True,
        "data": get_purchase_response(purchase, session)
    }


@router.post("/", response_model=dict)
def create_purchase(
    purchase_data: PurchaseCreate,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Crée un nouvel achat"""
    purchase = Purchase(
        reference=generate_purchase_reference(),
        company_id=current_user.company_id,
        supplier_id=purchase_data.supplier_id,
        project_id=purchase_data.project_id,
        category=purchase_data.category,
        description=purchase_data.description,
        supplier_reference=purchase_data.supplier_reference,
        purchase_date=purchase_data.purchase_date or date.today(),
        due_date=purchase_data.due_date,
        total_ht=purchase_data.total_ht,
        vat_rate=purchase_data.vat_rate,
        notes=purchase_data.notes,
        is_recurring=purchase_data.is_recurring,
        is_general_expense=purchase_data.is_general_expense,
        created_by_id=current_user.id,
    )
    
    # Calculer les totaux
    purchase.calculate_totals()
    
    session.add(purchase)
    session.commit()
    session.refresh(purchase)
    
    return {
        "success": True,
        "data": get_purchase_response(purchase, session)
    }


@router.put("/{purchase_id}", response_model=dict)
def update_purchase(
    purchase_id: int,
    purchase_data: PurchaseUpdate,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Met à jour un achat"""
    purchase = session.get(Purchase, purchase_id)
    if not purchase or purchase.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Achat non trouvé")
    
    update_data = purchase_data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(purchase, key, value)
    
    purchase.calculate_totals()
    purchase.updated_at = datetime.utcnow()
    session.add(purchase)
    session.commit()
    session.refresh(purchase)
    
    return {
        "success": True,
        "data": get_purchase_response(purchase, session)
    }


@router.post("/{purchase_id}/mark-paid", response_model=dict)
def mark_paid(
    purchase_id: int,
    payment: PurchasePayment,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Enregistre un paiement"""
    purchase = session.get(Purchase, purchase_id)
    if not purchase or purchase.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Achat non trouvé")
    
    purchase.amount_paid = purchase.amount_paid + payment.amount
    purchase.payment_method = payment.payment_method
    purchase.update_status()
    
    if purchase.status == PurchaseStatus.PAID:
        purchase.paid_date = payment.payment_date or date.today()
    
    purchase.updated_at = datetime.utcnow()
    session.add(purchase)
    session.commit()
    session.refresh(purchase)
    
    return {
        "success": True,
        "data": get_purchase_response(purchase, session)
    }


@router.delete("/{purchase_id}", response_model=dict)
def delete_purchase(
    purchase_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Supprime un achat"""
    purchase = session.get(Purchase, purchase_id)
    if not purchase or purchase.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Achat non trouvé")
    
    session.delete(purchase)
    session.commit()
    
    return {"success": True, "message": "Achat supprimé"}
