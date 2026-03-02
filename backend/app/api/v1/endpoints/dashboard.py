from typing import Optional
from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func, col
from datetime import datetime, date
from collections import defaultdict

from app.db.session import get_session
from app.models import User, Quote, Invoice, Customer, Project, LineItem
from app.models.enums import QuoteStatus, InvoiceStatus
from app.core.security import get_current_user_required

router = APIRouter()


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
            col(Quote.worksite_address) != "",  # type: ignore[arg-type]
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

    # Load line items in bulk to avoid N+1
    invoice_ids = [i.id for i in invoices if i.id is not None]
    quote_ids = [q.id for q in quotes if q.id is not None]

    invoice_items = session.exec(
        select(LineItem).where(col(LineItem.invoice_id).in_(invoice_ids))
    ).all() if invoice_ids else []
    quote_items = session.exec(
        select(LineItem).where(col(LineItem.quote_id).in_(quote_ids))
    ).all() if quote_ids else []

    invoice_totals: dict[int, float] = defaultdict(float)
    for item in invoice_items:
        if item.invoice_id is not None:
            invoice_totals[item.invoice_id] += float(item.total_ttc)

    quote_totals: dict[int, float] = defaultdict(float)
    for item in quote_items:
        if item.quote_id is not None:
            quote_totals[item.quote_id] += float(item.total_ttc)

    # Load customers in bulk for recent widgets
    customer_ids = {
        *(q.customer_id for q in quotes if q.customer_id),
        *(i.customer_id for i in invoices if i.customer_id),
        *(p.customer_id for p in projects if p.customer_id),
        *(q.customer_id for q in quotes_with_worksite if q.customer_id),
    }
    customers = session.exec(
        select(Customer).where(
            Customer.company_id == cid,
            col(Customer.id).in_(list(customer_ids)),
        )
    ).all() if customer_ids else []
    customer_map = {c.id: c.name for c in customers if c.id is not None}

    # Revenue encaisse this month
    paid_this_month = [i for i in invoices if i.status == InvoiceStatus.PAID
                       and i.invoice_date and i.invoice_date >= month_start]

    # CA total (all paid invoices)
    ca_total = round(
        sum(invoice_totals.get(inv.id, 0.0) for inv in invoices if inv.id is not None and inv.status == InvoiceStatus.PAID),
        2,
    )

    ca_mois = round(
        sum(invoice_totals.get(inv.id, 0.0) for inv in paid_this_month if inv.id is not None),
        2,
    )

    # Reste à encaisser
    reste = 0.0
    for inv in unpaid_inv:
        total = invoice_totals.get(inv.id, 0.0) if inv.id is not None else 0.0
        paid = float(inv.amount_paid or 0)
        reste += max(total - paid, 0.0)

    # Quote pending value
    pending_val = round(
        sum(quote_totals.get(q.id, 0.0) for q in pending_quotes if q.id is not None),
        2,
    )

    # Monthly analytics (last 6 months)
    month_keys: list[str] = []
    month_labels: dict[str, str] = {}
    for i in range(5, -1, -1):
        y = now.year
        m = now.month - i
        while m <= 0:
            y -= 1
            m += 12
        key = f"{y}-{m:02d}"
        month_keys.append(key)
        month_labels[key] = f"{m:02d}/{str(y)[2:]}"

    analytics_map: dict[str, dict[str, float]] = {
        key: {
            "paidRevenue": 0.0,
            "pendingInvoices": 0.0,
            "quotesCreated": 0.0,
            "quotesAccepted": 0.0,
        }
        for key in month_keys
    }

    for inv in invoices:
        if inv.id is None:
            continue
        inv_date = inv.invoice_date or (inv.created_at.date() if inv.created_at else None)
        if not inv_date:
            continue
        key = f"{inv_date.year}-{inv_date.month:02d}"
        if key not in analytics_map:
            continue
        total = invoice_totals.get(inv.id, 0.0)
        paid_amount = float(inv.amount_paid or 0)
        if inv.status == InvoiceStatus.PAID:
            analytics_map[key]["paidRevenue"] += total
        elif inv.status in (InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE):
            analytics_map[key]["pendingInvoices"] += max(total - paid_amount, 0.0)

    for q in quotes:
        quote_date = q.quote_date or (q.created_at.date() if q.created_at else None)
        if not quote_date:
            continue
        key = f"{quote_date.year}-{quote_date.month:02d}"
        if key not in analytics_map:
            continue
        analytics_map[key]["quotesCreated"] += 1
        if q.status in (QuoteStatus.ACCEPTED, QuoteStatus.SIGNED, QuoteStatus.FINALIZED):
            analytics_map[key]["quotesAccepted"] += 1

    monthly_analytics = [
        {
            "key": key,
            "label": month_labels[key],
            "paidRevenue": round(analytics_map[key]["paidRevenue"], 2),
            "pendingInvoices": round(analytics_map[key]["pendingInvoices"], 2),
            "quotesCreated": int(analytics_map[key]["quotesCreated"]),
            "quotesAccepted": int(analytics_map[key]["quotesAccepted"]),
        }
        for key in month_keys
    ]

    # Recent documents
    def quote_row(q: Quote) -> dict:
        cn = customer_map.get(q.customer_id, '') if q.customer_id else ''
        return {"id": q.id, "reference": q.reference, "status": q.status.value, "customer_name": cn,
            "amount": round(quote_totals.get(q.id, 0.0), 2), "date": q.quote_date.isoformat() if q.quote_date else None,
                "created_at": q.created_at.isoformat() if q.created_at else None}

    def inv_row(i: Invoice) -> dict:
        cn = customer_map.get(i.customer_id, '') if i.customer_id else ''
        return {"id": i.id, "reference": i.reference, "status": i.status.value, "customer_name": cn,
            "amount": round(invoice_totals.get(i.id, 0.0), 2), "amount_paid": float(i.amount_paid or 0),
                "date": i.invoice_date.isoformat() if i.invoice_date else None,
                "due_date": i.due_date.isoformat() if i.due_date else None,
                "created_at": i.created_at.isoformat() if i.created_at else None}

    def proj_row(p: Project) -> dict:
        cn = customer_map.get(p.customer_id, '') if p.customer_id else ''
        return {"id": p.id, "name": p.name, "status": getattr(p, 'status', 'active'),
                "customer_name": cn, "budget": float(getattr(p, 'budget', 0) or 0),
                "created_at": p.created_at.isoformat() if p.created_at else None}

    def worksite_quote_row(q: Quote) -> dict:
        cn = customer_map.get(q.customer_id, '') if q.customer_id else ''
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
            "quotes": {"total": len(quotes), "pending": len(pending_quotes), "pendingValue": pending_val},
            "invoices": {"total": len(invoices), "unpaid": len(unpaid_inv), "unpaidValue": round(reste, 2)},
            "revenue": {"total": round(ca_total, 2)},
            "monthlyAnalytics": monthly_analytics,
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
