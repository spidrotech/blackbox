from typing import Optional
from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func, col
from datetime import datetime, date

from app.db.session import get_session
from app.models import User, Quote, Invoice, Customer, Project, LineItem
from app.models.enums import QuoteStatus, InvoiceStatus
from app.core.security import get_current_user_required

router = APIRouter()


def _line_total(items: list) -> float:
    return round(sum(float(item.total_ttc) for item in items), 2)


@router.get("/", response_model=dict)
def get_dashboard(
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    cid = current_user.company_id
    now = datetime.now()
    month_start = date(now.year, now.month, 1)

    # Customers
    customers_total = session.exec(select(func.count(Customer.id)).where(Customer.company_id == cid)).one()

    # Projects
    projects = session.exec(select(Project).where(Project.company_id == cid)).all()
    active_projects = [p for p in projects if getattr(p, 'status', '') not in ('completed', 'cancelled', 'archived')]

    # Quotes with worksite_address but no project (count as virtual chantiers)
    quotes_with_worksite = session.exec(
        select(Quote).where(
            Quote.company_id == cid,
            Quote.worksite_address.isnot(None),  # type: ignore[union-attr]
            Quote.project_id.is_(None),  # type: ignore[union-attr]
        )
    ).all()
    # Total unique worksites = projects + quotes-only chantiers
    worksites_total = len(projects) + len(quotes_with_worksite)
    worksites_active = len(active_projects) + len(quotes_with_worksite)

    # Quotes
    quotes = session.exec(select(Quote).where(Quote.company_id == cid).order_by(col(Quote.created_at).desc())).all()
    pending_quotes = [q for q in quotes if q.status in (QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.VIEWED)]

    # Invoices
    invoices = session.exec(select(Invoice).where(Invoice.company_id == cid).order_by(col(Invoice.created_at).desc())).all()
    unpaid_inv = [i for i in invoices if i.status in (InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE)]

    # Revenue encaisse this month
    paid_this_month = [i for i in invoices if i.status == InvoiceStatus.PAID
                       and i.invoice_date and i.invoice_date >= month_start]

    # CA total (all paid invoices)
    ca_total = 0.0
    for inv in invoices:
        if inv.status == InvoiceStatus.PAID:
            items = session.exec(select(LineItem).where(LineItem.invoice_id == inv.id)).all()
            ca_total += _line_total(items)

    ca_mois = 0.0
    for inv in paid_this_month:
        items = session.exec(select(LineItem).where(LineItem.invoice_id == inv.id)).all()
        ca_mois += _line_total(items)

    # Reste à encaisser
    reste = 0.0
    for inv in unpaid_inv:
        items = session.exec(select(LineItem).where(LineItem.invoice_id == inv.id)).all()
        total = _line_total(items)
        paid = float(inv.amount_paid or 0)
        reste += total - paid

    # Quote pending value
    pending_val = 0.0
    for q in pending_quotes:
        items = session.exec(select(LineItem).where(LineItem.quote_id == q.id)).all()
        pending_val += _line_total(items)

    # Recent documents
    def quote_row(q: Quote) -> dict:
        items = session.exec(select(LineItem).where(LineItem.quote_id == q.id)).all()
        c = session.get(Customer, q.customer_id)
        cn = c.name if c else ''
        return {"id": q.id, "reference": q.reference, "status": q.status.value, "customer_name": cn,
                "amount": _line_total(items), "date": q.quote_date.isoformat() if q.quote_date else None,
                "created_at": q.created_at.isoformat() if q.created_at else None}

    def inv_row(i: Invoice) -> dict:
        items = session.exec(select(LineItem).where(LineItem.invoice_id == i.id)).all()
        c = session.get(Customer, i.customer_id)
        cn = c.name if c else ''
        return {"id": i.id, "reference": i.reference, "status": i.status.value, "customer_name": cn,
                "amount": _line_total(items), "amount_paid": float(i.amount_paid or 0),
                "date": i.invoice_date.isoformat() if i.invoice_date else None,
                "due_date": i.due_date.isoformat() if i.due_date else None,
                "created_at": i.created_at.isoformat() if i.created_at else None}

    def proj_row(p: Project) -> dict:
        c = session.get(Customer, p.customer_id) if p.customer_id else None
        cn = c.name if c else ''
        return {"id": p.id, "name": p.name, "status": getattr(p, 'status', 'active'),
                "customer_name": cn, "budget": float(getattr(p, 'budget', 0) or 0),
                "created_at": p.created_at.isoformat() if p.created_at else None}

    def worksite_quote_row(q: Quote) -> dict:
        c = session.get(Customer, q.customer_id)
        cn = c.name if c else ''
        return {"id": q.id, "name": f"Chantier – {q.reference}", "status": "quote",
                "customer_name": cn, "budget": 0.0,
                "worksite_address": q.worksite_address,
                "created_at": q.created_at.isoformat() if q.created_at else None,
                "type": "quote_worksite"}

    # Merge & sort chantiers (projects first, then quote worksites)
    all_recent_projects = [proj_row(p) for p in projects[:6]] + [worksite_quote_row(q) for q in quotes_with_worksite[:4]]

    return {
        "success": True,
        "data": {
            "ca_mois": round(ca_mois, 2),
            "ca_total": round(ca_total, 2),
            "reste_a_encaisser": round(reste, 2),
            "overdue_count": len([i for i in invoices if i.status == InvoiceStatus.OVERDUE]),
            "projects": {"total": worksites_total, "active": worksites_active},
            "customers": {"total": customers_total},
            "quotes": {"total": len(quotes), "pending": len(pending_quotes), "pendingValue": round(pending_val, 2)},
            "invoices": {"total": len(invoices), "unpaid": len(unpaid_inv), "unpaidValue": round(reste, 2)},
            "revenue": {"total": round(ca_total, 2)},
            "recentProjects": all_recent_projects[:8],
            "recentQuotes": [quote_row(q) for q in quotes[:10]],
            "recentInvoices": [inv_row(i) for i in invoices[:10]],
        }
    }


@router.get("/profitability/project/{project_id}", response_model=dict)
def project_profitability(
    project_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Calcul de rentabilité d'un projet"""
    return {
        "success": True,
        "data": {
            "projectId": project_id,
            "revenue": 0,
            "costs": {
                "purchases": 0,
                "labor": 0,
                "total": 0,
            },
            "profit": 0,
            "margin": 0,
        }
    }


@router.get("/profitability/company", response_model=dict)
def company_profitability(
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Calcul de rentabilité de l'entreprise"""
    from datetime import datetime
    if year is None:
        year = datetime.now().year
    
    return {
        "success": True,
        "data": {
            "year": year,
            "revenue": 0,
            "costs": {
                "purchases": 0,
                "labor": 0,
                "total": 0,
            },
            "profit": 0,
            "margin": 0,
        }
    }
