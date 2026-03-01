from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal

from app.db.session import get_session
from app.models import (
    Invoice, InvoiceCreate, InvoiceUpdate, PaymentCreate,
    LineItem, Customer, Project, Company, User
)
from app.models.enums import InvoiceStatus, LineItemType
from app.core.security import get_current_user_required

router = APIRouter()


def generate_invoice_reference(session: Session, company_id: int) -> str:
    """Génère une référence unique pour la facture"""
    company = session.get(Company, company_id)
    year = datetime.now().year
    prefix = company.invoice_prefix if company else "FA"
    number = company.next_invoice_number if company else 1
    
    reference = f"{prefix}{year}{str(number).zfill(4)}"
    
    if company:
        company.next_invoice_number = number + 1
        session.add(company)
    
    return reference


def get_invoice_response(invoice: Invoice, session: Session) -> dict:
    """Formatte la réponse facture"""
    customer = None
    if invoice.customer_id:
        cust = session.get(Customer, invoice.customer_id)
        if cust:
            customer = {
                "id": cust.id,
                "name": cust.name,
                "contact_name": cust.contact_name,
                "email": cust.email,
                "phone": cust.phone,
                "mobile": cust.mobile,
                "vat": cust.vat,
                "siret": cust.siret,
            }

    company = None
    if invoice.company_id:
        comp = session.get(Company, invoice.company_id)
        if comp:
            company = {
                "id": comp.id,
                "name": comp.name,
                "siret": comp.siret,
                "address": comp.address,
                "city": comp.city,
                "postalCode": comp.postal_code,
                "phone": comp.phone,
                "email": comp.email,
                "website": comp.website,
                "vatNumber": comp.vat_number,
                "vatSubject": comp.vat_subject,
                "vatCollectionType": comp.vat_collection_type,
                "iban": comp.iban,
                "bic": comp.bic,
                "rcsCity": comp.rcs_city,
                "capital": comp.capital,
                "legalMentions": comp.legal_mentions,
                "logoUrl": comp.logo_url,
                "defaultConditions": comp.default_conditions,
                "defaultPaymentTerms": comp.default_payment_terms,
            }
    
    # Récupérer les lignes
    statement = select(LineItem).where(LineItem.invoice_id == invoice.id).order_by(LineItem.display_order)
    line_items = session.exec(statement).all()
    
    items = []
    total_ht = Decimal(0)
    total_tva = Decimal(0)
    
    for item in line_items:
        subtotal = item.quantity * item.unit_price
        item_ht = subtotal
        if item.discount:
            item_ht -= item.discount
        elif item.discount_percent:
            item_ht -= item_ht * item.discount_percent / 100
        item_tva = item_ht * item.tax_rate / 100
        
        total_ht += item_ht
        total_tva += item_tva
        
        items.append({
            "id": item.id,
            "description": item.description,
            "designation": item.description,
            "long_description": item.long_description,
            "item_type": item.item_type.value if hasattr(item.item_type, "value") else str(item.item_type),
            "quantity": float(item.quantity),
            "unit": item.unit,
            "unit_price": float(item.unit_price),
            "discount": float(item.discount) if item.discount else None,
            "discount_percent": float(item.discount_percent) if item.discount_percent else None,
            "vat_rate": float(item.tax_rate),
            "reference": item.reference,
            "total_ht": float(item_ht),
            "total_tva": float(item_tva),
            "display_order": item.display_order,
        })
    
    total_ttc = total_ht + total_tva
    amount_paid = invoice.amount_paid or Decimal(0)
    remaining = total_ttc - amount_paid
    
    return {
        "id": invoice.id,
        "companyId": invoice.company_id,
        "customerId": invoice.customer_id,
        "projectId": invoice.project_id,
        "quoteId": invoice.quote_id,
        "reference": invoice.reference,
        "status": invoice.status.value if hasattr(invoice.status, "value") else str(invoice.status),
        "description": invoice.description,
        "invoiceDate": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
        "dueDate": invoice.due_date.isoformat() if invoice.due_date else None,
        "paidDate": invoice.paid_date.isoformat() if invoice.paid_date else None,
        "amountPaid": float(amount_paid),
        "notes": invoice.notes,
        "paymentTerms": invoice.payment_terms,
        "bankDetails": invoice.bank_details,
        "purchaseOrder": invoice.purchase_order,
        "conditions": invoice.conditions,
        "invoiceType": invoice.invoice_type,
        "totalHt": float(total_ht),
        "totalTva": float(total_tva),
        "totalTtc": float(total_ttc),
        "total": float(total_ttc),
        "remainingAmount": float(remaining),
        "createdAt": invoice.created_at.isoformat(),
        "customer": customer,
        "company": company,
        "line_items": items,
        "lineItems": items,
    }


@router.get("/", response_model=dict)
def list_invoices(
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste toutes les factures de l'entreprise"""
    statement = select(Invoice).where(Invoice.company_id == current_user.company_id)
    
    if status:
        statement = statement.where(Invoice.status == status)
    
    if customer_id:
        statement = statement.where(Invoice.customer_id == customer_id)
    
    if search:
        statement = statement.where(
            (Invoice.reference.ilike(f"%{search}%")) |
            (Invoice.description.ilike(f"%{search}%"))
        )
    
    statement = statement.order_by(Invoice.created_at.desc()).offset(skip).limit(limit)
    invoices = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [get_invoice_response(i, session) for i in invoices],
        "items": [get_invoice_response(i, session) for i in invoices],
        "invoices": [get_invoice_response(i, session) for i in invoices],
        "meta": {"total": len(invoices)}
    }


@router.get("/{invoice_id}", response_model=dict)
def get_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Récupère une facture par son ID"""
    invoice = session.get(Invoice, invoice_id)
    if not invoice or invoice.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    invoice_data = get_invoice_response(invoice, session)
    return {
        "success": True,
        "data": invoice_data,
        "invoice": invoice_data,
    }


@router.post("/", response_model=dict)
def create_invoice(
    invoice_data: InvoiceCreate,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Crée une nouvelle facture"""
    # Vérifier le client
    customer = session.get(Customer, invoice_data.customer_id)
    if not customer or customer.company_id != current_user.company_id:
        raise HTTPException(status_code=400, detail="Client non trouvé")
    
    # Générer la référence
    reference = generate_invoice_reference(session, current_user.company_id)
    
    invoice = Invoice(
        company_id=current_user.company_id,
        customer_id=invoice_data.customer_id,
        project_id=invoice_data.project_id,
        quote_id=invoice_data.quote_id,
        reference=reference,
        status=InvoiceStatus.DRAFT,
        description=invoice_data.description,
        invoice_date=invoice_data.invoice_date or date.today(),
        due_date=invoice_data.due_date or (date.today() + timedelta(days=30)),
        notes=invoice_data.notes,
        payment_terms=invoice_data.payment_terms,
        bank_details=invoice_data.bank_details,
        purchase_order=invoice_data.purchase_order,
        conditions=invoice_data.conditions,
        invoice_type=invoice_data.invoice_type,
        created_by_id=current_user.id,
    )
    session.add(invoice)
    session.commit()
    session.refresh(invoice)
    
    # Ajouter les lignes
    if invoice_data.line_items:
        for i, item_data in enumerate(invoice_data.line_items):
            raw_type = item_data.get("item_type") or "supply"
            try:
                resolved_type = LineItemType(raw_type)
            except ValueError:
                resolved_type = LineItemType.SUPPLY
            is_structural = resolved_type in (
                LineItemType.SECTION, LineItemType.TEXT, LineItemType.PAGE_BREAK
            )
            line_item = LineItem(
                invoice_id=invoice.id,
                description=item_data.get("designation") or item_data.get("description") or "",
                long_description=item_data.get("long_description"),
                item_type=resolved_type,
                quantity=Decimal(str(item_data.get("quantity") or 0)) if is_structural else Decimal(str(item_data.get("quantity") or 1)),
                unit=item_data.get("unit", "u"),
                unit_price=Decimal(str(item_data.get("unit_price") or 0)),
                discount=Decimal(str(item_data["discount"])) if item_data.get("discount") else None,
                discount_percent=Decimal(str(item_data.get("discount_percent") or 0)) if item_data.get("discount_percent") else None,
                tax_rate=Decimal(str(item_data.get("vat_rate") or 20)),
                reference=item_data.get("reference"),
                brand=item_data.get("brand"),
                model=item_data.get("model"),
                display_order=i,
            )
            session.add(line_item)
        session.commit()
    
    return {
        "success": True,
        "invoice": get_invoice_response(invoice, session)
    }


@router.put("/{invoice_id}", response_model=dict)
def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Met à jour une facture"""
    invoice = session.get(Invoice, invoice_id)
    if not invoice or invoice.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    update_data = invoice_data.model_dump(exclude_unset=True)
    
    # Gérer les lignes séparément
    line_items_data = update_data.pop("line_items", None)
    
    for key, value in update_data.items():
        # Ne jamais écraser customer_id avec 0 (FK violation) ou None
        if key == "customer_id" and not value:
            continue
        setattr(invoice, key, value)
    
    invoice.updated_at = datetime.utcnow()
    session.add(invoice)
    
    # Mettre à jour les lignes
    if line_items_data is not None:
        # Supprimer les anciennes lignes
        old_items = session.exec(select(LineItem).where(LineItem.invoice_id == invoice.id)).all()
        for item in old_items:
            session.delete(item)
        
        # Ajouter les nouvelles
        for i, item_data in enumerate(line_items_data):
            raw_type = item_data.get("item_type") or "supply"
            try:
                resolved_type = LineItemType(raw_type)
            except ValueError:
                resolved_type = LineItemType.SUPPLY
            is_structural = resolved_type in (
                LineItemType.SECTION, LineItemType.TEXT, LineItemType.PAGE_BREAK
            )
            line_item = LineItem(
                invoice_id=invoice.id,
                description=item_data.get("designation") or item_data.get("description") or "",
                long_description=item_data.get("long_description"),
                item_type=resolved_type,
                quantity=Decimal(str(item_data.get("quantity") or 0)) if is_structural else Decimal(str(item_data.get("quantity") or 1)),
                unit=item_data.get("unit", "u"),
                unit_price=Decimal(str(item_data.get("unit_price") or 0)),
                discount=Decimal(str(item_data["discount"])) if item_data.get("discount") else None,
                discount_percent=Decimal(str(item_data.get("discount_percent") or 0)) if item_data.get("discount_percent") else None,
                tax_rate=Decimal(str(item_data.get("vat_rate") or 20)),
                reference=item_data.get("reference"),
                brand=item_data.get("brand"),
                model=item_data.get("model"),
                display_order=i,
            )
            session.add(line_item)
    
    session.commit()
    session.refresh(invoice)
    
    return {
        "success": True,
        "invoice": get_invoice_response(invoice, session)
    }


@router.post("/{invoice_id}/payment", response_model=dict)
def add_payment(
    invoice_id: int,
    payment: PaymentCreate,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Enregistre un paiement sur une facture"""
    invoice = session.get(Invoice, invoice_id)
    if not invoice or invoice.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    current_paid = invoice.amount_paid or Decimal(0)
    invoice.amount_paid = current_paid + payment.amount
    
    # Récupérer le total pour vérifier si payée complètement
    response = get_invoice_response(invoice, session)
    total_ttc = Decimal(str(response["totalTtc"]))
    
    if invoice.amount_paid >= total_ttc:
        invoice.status = InvoiceStatus.PAID
        invoice.paid_date = payment.payment_date or date.today()
    elif invoice.amount_paid > 0:
        invoice.status = InvoiceStatus.PARTIAL
    
    invoice.updated_at = datetime.utcnow()
    session.add(invoice)
    session.commit()
    session.refresh(invoice)
    
    return {
        "success": True,
        "invoice": get_invoice_response(invoice, session)
    }


@router.post("/{invoice_id}/send", response_model=dict)
def send_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Marque une facture comme envoyée"""
    invoice = session.get(Invoice, invoice_id)
    if not invoice or invoice.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    if invoice.status == InvoiceStatus.DRAFT:
        invoice.status = InvoiceStatus.SENT
        invoice.updated_at = datetime.utcnow()
        session.add(invoice)
        session.commit()
        session.refresh(invoice)
    
    return {
        "success": True,
        "invoice": get_invoice_response(invoice, session)
    }


@router.patch("/{invoice_id}/status", response_model=dict)
def update_invoice_status(
    invoice_id: int,
    status: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Met à jour le statut d'une facture"""
    invoice = session.get(Invoice, invoice_id)
    if not invoice or invoice.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    try:
        new_status = InvoiceStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Statut invalide: {status}")

    invoice.status = new_status
    invoice.updated_at = datetime.utcnow()
    session.add(invoice)
    session.commit()
    session.refresh(invoice)

    return {
        "success": True,
        "invoice": get_invoice_response(invoice, session)
    }


@router.delete("/{invoice_id}", response_model=dict)
def delete_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Supprime une facture"""
    invoice = session.get(Invoice, invoice_id)
    if not invoice or invoice.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    # Supprimer les lignes
    items = session.exec(select(LineItem).where(LineItem.invoice_id == invoice.id)).all()
    for item in items:
        session.delete(item)
    
    session.delete(invoice)
    session.commit()
    
    return {"success": True, "message": "Facture supprimée"}
