from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from typing import Optional
from datetime import datetime
from decimal import Decimal

from app.db.session import get_session
from app.models import (
    Project, Invoice, Quote, Purchase, TimeEntry, Customer, User
)
from app.core.security import get_current_user_required

router = APIRouter()


@router.get("/", response_model=dict)
def get_dashboard(
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Récupère les données du tableau de bord"""
    company_id = current_user.company_id
    
    # Projets
    projects = session.exec(
        select(Project).where(Project.company_id == company_id)
    ).all()
    
    active_projects = [p for p in projects if p.status in ['planned', 'in_progress']]
    
    # Clients
    customers = session.exec(
        select(Customer).where(Customer.company_id == company_id, Customer.is_active == True)
    ).all()
    
    # Devis
    quotes = session.exec(
        select(Quote).where(Quote.company_id == company_id)
    ).all()
    
    pending_quotes = [q for q in quotes if q.status in ['sent', 'viewed']]
    
    # Factures
    invoices = session.exec(
        select(Invoice).where(Invoice.company_id == company_id)
    ).all()
    
    unpaid_invoices = [i for i in invoices if i.status in ['sent', 'partial', 'overdue']]
    
    # Calculs financiers
    total_quotes_pending = Decimal(0)
    total_invoices_unpaid = Decimal(0)
    total_revenue = Decimal(0)
    
    for q in pending_quotes:
        # Approximation
        total_quotes_pending += Decimal("1000")
    
    for i in invoices:
        if i.status == 'paid':
            total_revenue += i.amount_paid or Decimal(0)
        elif i.status in ['sent', 'partial', 'overdue']:
            total_invoices_unpaid += Decimal("1000") - (i.amount_paid or Decimal(0))
    
    return {
        "success": True,
        "data": {
            "projects": {
                "total": len(projects),
                "active": len(active_projects),
            },
            "customers": {
                "total": len(customers),
            },
            "quotes": {
                "total": len(quotes),
                "pending": len(pending_quotes),
                "pendingValue": float(total_quotes_pending),
            },
            "invoices": {
                "total": len(invoices),
                "unpaid": len(unpaid_invoices),
                "unpaidValue": float(total_invoices_unpaid),
            },
            "revenue": {
                "total": float(total_revenue),
            },
            "recentProjects": [
                {
                    "id": p.id,
                    "name": p.name,
                    "status": p.status.value if p.status else "draft",
                    "createdAt": p.created_at.isoformat(),
                }
                for p in sorted(projects, key=lambda x: x.created_at, reverse=True)[:5]
            ],
            "recentQuotes": [
                {
                    "id": q.id,
                    "reference": q.reference,
                    "status": q.status.value if q.status else "draft",
                    "createdAt": q.created_at.isoformat(),
                }
                for q in sorted(quotes, key=lambda x: x.created_at, reverse=True)[:5]
            ],
            "recentInvoices": [
                {
                    "id": i.id,
                    "reference": i.reference,
                    "status": i.status.value if i.status else "draft",
                    "createdAt": i.created_at.isoformat(),
                }
                for i in sorted(invoices, key=lambda x: x.created_at, reverse=True)[:5]
            ],
        }
    }


@router.get("/profitability/project/{project_id}", response_model=dict)
def project_profitability(
    project_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Calcul de rentabilité d'un projet"""
    project = session.get(Project, project_id)
    if not project or project.company_id != current_user.company_id:
        return {"success": False, "error": "Projet non trouvé"}
    
    # Revenus (factures payées)
    invoices = session.exec(
        select(Invoice).where(Invoice.project_id == project_id)
    ).all()
    total_revenue = sum(float(i.amount_paid or 0) for i in invoices)
    
    # Coûts (achats + main d'œuvre)
    purchases = session.exec(
        select(Purchase).where(Purchase.project_id == project_id)
    ).all()
    total_purchases = sum(float(p.total_ttc or p.total_ht or 0) for p in purchases)
    
    time_entries = session.exec(
        select(TimeEntry).where(TimeEntry.project_id == project_id)
    ).all()
    total_labor = sum(float(t.total_cost or 0) for t in time_entries)
    
    total_costs = total_purchases + total_labor
    profit = total_revenue - total_costs
    margin = (profit / total_revenue * 100) if total_revenue > 0 else 0
    
    return {
        "success": True,
        "data": {
            "projectId": project_id,
            "projectName": project.name,
            "revenue": total_revenue,
            "costs": {
                "purchases": total_purchases,
                "labor": total_labor,
                "total": total_costs,
            },
            "profit": profit,
            "margin": margin,
            "budget": float(project.estimated_budget or 0),
            "budgetVariance": float(project.estimated_budget or 0) - total_costs,
        }
    }


@router.get("/profitability/company", response_model=dict)
def company_profitability(
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Calcul de rentabilité de l'entreprise"""
    if year is None:
        year = datetime.now().year
    
    company_id = current_user.company_id
    
    # Revenus
    invoices = session.exec(
        select(Invoice).where(Invoice.company_id == company_id)
    ).all()
    year_invoices = [i for i in invoices if i.invoice_date and i.invoice_date.year == year]
    total_revenue = sum(float(i.amount_paid or 0) for i in year_invoices)
    
    # Coûts
    purchases = session.exec(
        select(Purchase).where(Purchase.company_id == company_id)
    ).all()
    year_purchases = [p for p in purchases if p.purchase_date and p.purchase_date.year == year]
    total_purchases = sum(float(p.total_ttc or p.total_ht or 0) for p in year_purchases)
    
    time_entries = session.exec(
        select(TimeEntry).where(TimeEntry.company_id == company_id)
    ).all()
    year_entries = [t for t in time_entries if t.work_date and t.work_date.year == year]
    total_labor = sum(float(t.total_cost or 0) for t in year_entries)
    
    total_costs = total_purchases + total_labor
    profit = total_revenue - total_costs
    margin = (profit / total_revenue * 100) if total_revenue > 0 else 0
    
    return {
        "success": True,
        "data": {
            "year": year,
            "revenue": total_revenue,
            "costs": {
                "purchases": total_purchases,
                "labor": total_labor,
                "total": total_costs,
            },
            "profit": profit,
            "margin": margin,
        }
    }
