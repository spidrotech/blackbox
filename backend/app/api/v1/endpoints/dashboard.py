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

    # Customers (aligné avec l'onglet Clients qui filtre par défaut les actifs)
    customers_total = session.exec(
        select(func.count(col(Customer.id))).where(
            Customer.company_id == cid,
            Customer.is_active == True,  # noqa: E712
        )
    ).one()

    # Projects
    projects = session.exec(select(Project).where(Project.company_id == cid)).all()
    active_projects = [p for p in projects if getattr(p, 'status', '') not in ('completed', 'cancelled', 'archived')]

    projects_total = len(projects)
    projects_active = len(active_projects)

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
        quote_amount = round(quote_totals.get(q.id, 0.0), 2) if q.id is not None else 0.0
        return {"id": q.id, "reference": q.reference, "status": q.status.value, "customer_name": cn,
            "amount": quote_amount, "date": q.quote_date.isoformat() if q.quote_date else None,
                "created_at": q.created_at.isoformat() if q.created_at else None}

    def inv_row(i: Invoice) -> dict:
        cn = customer_map.get(i.customer_id, '') if i.customer_id else ''
        invoice_amount = round(invoice_totals.get(i.id, 0.0), 2) if i.id is not None else 0.0
        return {"id": i.id, "reference": i.reference, "status": i.status.value, "customer_name": cn,
            "amount": invoice_amount, "amount_paid": float(i.amount_paid or 0),
                "date": i.invoice_date.isoformat() if i.invoice_date else None,
                "due_date": i.due_date.isoformat() if i.due_date else None,
                "created_at": i.created_at.isoformat() if i.created_at else None}

    def proj_row(p: Project) -> dict:
        cn = customer_map.get(p.customer_id, '') if p.customer_id else ''
        return {"id": p.id, "name": p.name, "status": getattr(p, 'status', 'active'),
                "customer_name": cn, "budget": float(getattr(p, 'budget', 0) or 0),
                "created_at": p.created_at.isoformat() if p.created_at else None}

    all_recent_projects = [proj_row(p) for p in projects[:8]]

    # Also include quotes that have a worksite address (shown as "chantiers" in the projects page)
    quotes_with_worksite = [q for q in quotes if getattr(q, 'worksite_address', None)]
    quote_worksite_rows = [
        {
            "id": q.id,
            "name": (q.description or q.reference or (f"Devis {q.id}" if q.id is not None else "Devis")) if q else "—",
            "status": q.status.value if hasattr(q.status, 'value') else str(q.status),
            "customer_name": customer_map.get(q.customer_id, '') if q.customer_id else '',
            "worksite_address": q.worksite_address,
            "type": "quote_worksite",
            "created_at": q.created_at.isoformat() if q.created_at else None,
        }
        for q in quotes_with_worksite
    ]

    # Merge and sort by creation date (most recent first)
    all_chantiers = all_recent_projects + quote_worksite_rows
    all_chantiers.sort(key=lambda x: x.get("created_at") or "", reverse=True)

    # Update counts to include quote worksites
    worksites_active_count = len([q for q in quotes_with_worksite if q.status not in (QuoteStatus.REJECTED, QuoteStatus.CANCELLED)]) if quotes_with_worksite else 0

    return {
        "success": True,
        "data": {
            "ca_mois": round(ca_mois, 2),
            "ca_total": round(ca_total, 2),
            "reste_a_encaisser": round(reste, 2),
            "overdue_count": len([i for i in invoices if i.status == InvoiceStatus.OVERDUE]),
            "projects": {"total": projects_total + len(quotes_with_worksite), "active": projects_active + worksites_active_count},
            "customers": {"total": customers_total},
            "quotes": {"total": len(quotes), "pending": len(pending_quotes), "pendingValue": pending_val},
            "invoices": {"total": len(invoices), "unpaid": len(unpaid_inv), "unpaidValue": round(reste, 2)},
            "revenue": {"total": round(ca_total, 2)},
            "monthlyAnalytics": monthly_analytics,
            "recentProjects": all_chantiers[:8],
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


@router.get("/reports/financial", response_model=dict)
def get_financial_reports(
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session),
) -> dict:
    """Rapport financier annuel : CA mensuel, TVA collectée, taux de transformation devis."""
    from datetime import datetime
    from collections import defaultdict

    if year is None:
        year = datetime.now().year

    cid = current_user.company_id

    invoices = session.exec(
        select(Invoice).where(Invoice.company_id == cid)
    ).all()
    quotes = session.exec(
        select(Quote).where(Quote.company_id == cid)
    ).all()

    invoice_ids = [i.id for i in invoices if i.id is not None]
    quote_ids = [q.id for q in quotes if q.id is not None]

    invoice_items = session.exec(
        select(LineItem).where(col(LineItem.invoice_id).in_(invoice_ids))
    ).all() if invoice_ids else []
    quote_items = session.exec(
        select(LineItem).where(col(LineItem.quote_id).in_(quote_ids))
    ).all() if quote_ids else []

    # Build totals maps
    inv_ht: dict[int, float] = defaultdict(float)
    inv_tva: dict[int, float] = defaultdict(float)
    for item in invoice_items:
        if item.invoice_id is not None:
            inv_ht[item.invoice_id] += float(item.total_ht)
            inv_tva[item.invoice_id] += float(item.total_tva)

    qt_ttc: dict[int, float] = defaultdict(float)
    for item in quote_items:
        if item.quote_id is not None:
            qt_ttc[item.quote_id] += float(item.total_ttc)

    # Filter by year
    year_invoices = [i for i in invoices if i.invoice_date and i.invoice_date.year == year]
    year_quotes = [q for q in quotes if (q.quote_date or (q.created_at.date() if q.created_at else None)) and
                   (q.quote_date or q.created_at.date()).year == year]

    # Monthly breakdown
    months_data = []
    for m in range(1, 13):
        m_invs = [i for i in year_invoices if i.invoice_date.month == m]
        paid_ht = sum(inv_ht.get(i.id, 0) for i in m_invs if i.id and i.status == InvoiceStatus.PAID)
        paid_tva = sum(inv_tva.get(i.id, 0) for i in m_invs if i.id and i.status == InvoiceStatus.PAID)
        pending_ht = sum(inv_ht.get(i.id, 0) for i in m_invs if i.id and
                         i.status in (InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE))
        month_quotes = [q for q in year_quotes if (q.quote_date or q.created_at.date()).month == m]
        quotes_sent = len(month_quotes)
        quotes_accepted = len([q for q in month_quotes if q.status in (QuoteStatus.ACCEPTED, QuoteStatus.SIGNED, QuoteStatus.FINALIZED)])

        months_data.append({
            "month": m,
            "label": ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
                       "Juil", "Août", "Sep", "Oct", "Nov", "Déc"][m - 1],
            "paidHt": round(paid_ht, 2),
            "paidTva": round(paid_tva, 2),
            "paidTtc": round(paid_ht + paid_tva, 2),
            "pendingHt": round(pending_ht, 2),
            "quotesSent": quotes_sent,
            "quotesAccepted": quotes_accepted,
            "conversionRate": round(quotes_accepted / quotes_sent * 100, 1) if quotes_sent > 0 else 0,
        })

    # Yearly totals
    total_paid_ht = sum(m["paidHt"] for m in months_data)
    total_paid_tva = sum(m["paidTva"] for m in months_data)
    total_pending_ht = sum(m["pendingHt"] for m in months_data)
    total_quotes_sent = sum(m["quotesSent"] for m in months_data)
    total_quotes_accepted = sum(m["quotesAccepted"] for m in months_data)

    # Invoices by status for year
    status_breakdown = defaultdict(int)
    for i in year_invoices:
        status_breakdown[i.status.value] += 1

    return {
        "success": True,
        "year": year,
        "months": months_data,
        "totals": {
            "paidHt": round(total_paid_ht, 2),
            "paidTva": round(total_paid_tva, 2),
            "paidTtc": round(total_paid_ht + total_paid_tva, 2),
            "pendingHt": round(total_pending_ht, 2),
            "quotesSent": total_quotes_sent,
            "quotesAccepted": total_quotes_accepted,
            "conversionRate": round(total_quotes_accepted / total_quotes_sent * 100, 1) if total_quotes_sent > 0 else 0,
        },
        "statusBreakdown": dict(status_breakdown),
    }
