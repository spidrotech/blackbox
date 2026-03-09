from fastapi import APIRouter, Depends, HTTPException, Query, Body
from fastapi.responses import Response
from sqlmodel import Session, select, col
from typing import List, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal

from app.db.session import get_session
from app.models import (
    Invoice, InvoiceCreate, InvoiceUpdate, PaymentCreate,
    LineItem, Customer, Project, Company, User, Quote, Address
)
from app.models.enums import InvoiceStatus, LineItemType
from app.core.security import get_current_user_required
from app.services.pdf_service import (
    HAS_REPORTLAB,
    CompanyData,
    CustomerData,
    LineItemData,
    QuoteData,
    generate_invoice_pdf,
)
from app.services.facturx_service import (
    HAS_FACTURX,
    generate_facturx_pdf,
    build_facturx_invoice_from_db,
)

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


def _default_bank_details(company: Optional[Company]) -> Optional[str]:
    if not company:
        return None
    if company.iban and company.bic:
        return f"IBAN : {company.iban}\nBIC : {company.bic}"
    if company.iban:
        return f"IBAN : {company.iban}"
    return None


def _build_company_pdf_data(company_obj: Optional[Company]) -> CompanyData:
    co = CompanyData()
    if not company_obj:
        return co

    co.name = company_obj.name or ""
    co.address = company_obj.address or ""
    co.city = company_obj.city or ""
    co.postal_code = company_obj.postal_code or ""
    co.country = company_obj.country or "France"
    co.phone = company_obj.phone or ""
    co.email = company_obj.email or ""
    co.website = company_obj.website or ""
    co.siret = company_obj.siret or ""
    co.vat_number = company_obj.vat_number or ""
    co.iban = company_obj.iban or ""
    co.bic = company_obj.bic or ""
    co.logo_url = company_obj.logo_url or ""
    co.header_text = company_obj.header_text or ""
    co.footer_text = company_obj.footer_text or ""
    co.vat_subject = bool(getattr(company_obj, 'vat_subject', True))
    co.rcs_city = getattr(company_obj, 'rcs_city', None) or ""
    co.rm_number = getattr(company_obj, 'rm_number', None) or ""
    co.capital = float(getattr(company_obj, 'capital', None) or 0)
    co.ape_code = getattr(company_obj, 'ape_code', None) or ""
    co.guarantee_type = getattr(company_obj, 'guarantee_type', None) or ""
    co.insurance_name = getattr(company_obj, 'insurance_name', None) or ""
    co.insurance_coverage = getattr(company_obj, 'insurance_coverage', None) or ""
    co.insurance_address = getattr(company_obj, 'insurance_address', None) or ""
    co.insurance_zipcode = getattr(company_obj, 'insurance_zipcode', None) or ""
    co.insurance_city = getattr(company_obj, 'insurance_city', None) or ""
    co.visuals_json = getattr(company_obj, 'visuals_json', None) or ""
    return co


def _build_customer_pdf_data(session: Session, customer_obj: Optional[Customer]) -> CustomerData:
    cu = CustomerData()
    if not customer_obj:
        return cu

    cu.name = customer_obj.name or ""
    cu.contact_name = customer_obj.contact_name or ""
    cu.phone = customer_obj.phone or customer_obj.mobile or ""
    cu.email = customer_obj.email or ""
    cu.siret = customer_obj.siret or ""
    cu.vat = customer_obj.vat or ""

    address_obj = session.get(Address, customer_obj.address_id) if customer_obj.address_id else None
    if address_obj:
        street_line = " ".join(part for part in [address_obj.number or "", address_obj.street or ""] if part).strip()
        if address_obj.complement:
            cu.address = ", ".join(part for part in [street_line, address_obj.complement] if part)
        else:
            cu.address = street_line
        cu.city = address_obj.city or ""
        cu.postal_code = address_obj.postal_code or ""
        cu.country = address_obj.country or "France"

    return cu


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
        # Acompte
        "depositPercent": float(invoice.deposit_percent) if invoice.deposit_percent else None,
        # Situation de travaux
        "situationNumber": invoice.situation_number,
        "situationPercent": float(invoice.situation_percent) if invoice.situation_percent else None,
        "cumulativePercent": float(invoice.cumulative_percent) if invoice.cumulative_percent else None,
        # Retenue de garantie
        "retentionPercent": float(invoice.retention_percent) if invoice.retention_percent else None,
        "retentionReleased": invoice.retention_released or False,
        "retentionReleaseInvoiceId": invoice.retention_release_invoice_id,
        "retentionAmount": float(total_ht * (invoice.retention_percent or Decimal(0)) / 100) if invoice.retention_percent else None,
        # Avoir
        "originalInvoiceId": invoice.original_invoice_id,
        # Factur-X
        "facturxStatus": invoice.facturx_status,
        "sirenBuyer": invoice.siren_buyer,
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
    invoice_type: Optional[str] = None,
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
    
    if invoice_type:
        statement = statement.where(Invoice.invoice_type == invoice_type)
    
    if customer_id:
        statement = statement.where(Invoice.customer_id == customer_id)
    
    if search:
        statement = statement.where(
            (col(Invoice.reference).ilike(f"%{search}%")) |  # type: ignore[arg-type]
            (col(Invoice.description).ilike(f"%{search}%"))  # type: ignore[arg-type]
        )
    
    statement = statement.order_by(col(Invoice.created_at).desc()).offset(skip).limit(limit)
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

    company = session.get(Company, current_user.company_id)
    
    # Générer la référence
    company_id = current_user.company_id or customer.company_id
    reference = generate_invoice_reference(session, company_id)
    
    invoice = Invoice(
        company_id=company_id,
        customer_id=invoice_data.customer_id,
        project_id=invoice_data.project_id,
        quote_id=invoice_data.quote_id,
        reference=reference,
        status=InvoiceStatus.DRAFT,
        description=invoice_data.description,
        invoice_date=invoice_data.invoice_date or date.today(),
        due_date=invoice_data.due_date or (date.today() + timedelta(days=30)),
        notes=invoice_data.notes,
        payment_terms=invoice_data.payment_terms or (company.default_payment_terms if company else None),
        bank_details=invoice_data.bank_details or _default_bank_details(company),
        purchase_order=invoice_data.purchase_order,
        conditions=invoice_data.conditions or (company.default_conditions if company else None),
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

    if payment.amount <= 0:
        raise HTTPException(status_code=400, detail="Le montant du paiement doit être supérieur à 0")

    # Calcule le total TTC courant de la facture
    response_before = get_invoice_response(invoice, session)
    total_ttc = Decimal(str(response_before["totalTtc"]))
    current_paid = invoice.amount_paid or Decimal(0)
    remaining_before = max(total_ttc - current_paid, Decimal(0))

    # Idempotence : déjà soldée -> ne pas cumuler un nouveau paiement
    if invoice.status == InvoiceStatus.PAID or remaining_before <= 0:
        return {
            "success": True,
            "invoice": get_invoice_response(invoice, session),
            "message": "Facture déjà soldée",
        }
    
    # Empêche tout dépassement en cas de double clic / double requête
    applied_amount = min(payment.amount, remaining_before)
    invoice.amount_paid = current_paid + applied_amount
    
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


@router.post("/{invoice_id}/duplicate", response_model=dict)
def duplicate_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session),
):
    """Duplique une facture en créant un nouveau brouillon"""
    original = session.get(Invoice, invoice_id)
    if not original or original.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    company_id = current_user.company_id or original.company_id
    new_reference = generate_invoice_reference(session, company_id)

    new_invoice = Invoice(
        company_id=company_id,
        customer_id=original.customer_id,
        project_id=original.project_id,
        quote_id=original.quote_id,
        reference=new_reference,
        status=InvoiceStatus.DRAFT,
        description=original.description,
        invoice_date=date.today(),
        due_date=date.today() + timedelta(days=30),
        notes=original.notes,
        payment_terms=original.payment_terms,
        bank_details=original.bank_details,
        purchase_order=original.purchase_order,
        conditions=original.conditions,
        invoice_type=original.invoice_type,
        global_discount=original.global_discount,
        global_discount_percent=original.global_discount_percent,
        created_by_id=current_user.id,
    )
    session.add(new_invoice)
    session.commit()
    session.refresh(new_invoice)

    # Copier les lignes
    original_items = session.exec(
        select(LineItem).where(LineItem.invoice_id == original.id).order_by(LineItem.display_order)
    ).all()
    for item in original_items:
        new_item = LineItem(
            invoice_id=new_invoice.id,
            description=item.description,
            long_description=item.long_description,
            item_type=item.item_type,
            quantity=item.quantity,
            unit=item.unit,
            unit_price=item.unit_price,
            discount=item.discount,
            discount_percent=item.discount_percent,
            tax_rate=item.tax_rate,
            reference=item.reference,
            brand=item.brand,
            model=item.model,
            display_order=item.display_order,
        )
        session.add(new_item)
    session.commit()

    return {"success": True, "invoice": get_invoice_response(new_invoice, session)}


@router.post("/{invoice_id}/credit-note", response_model=dict)
def create_credit_note(
    invoice_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session),
):
    """Crée un avoir (credit note) lié à une facture existante"""
    original = session.get(Invoice, invoice_id)
    if not original or original.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    if original.invoice_type == "credit_note":
        raise HTTPException(status_code=400, detail="Impossible de créer un avoir sur un avoir")

    company = session.get(Company, current_user.company_id)
    company_id = current_user.company_id or original.company_id

    # Préfixe "AV" pour avoir
    year = datetime.now().year
    prefix = "AV"
    number = company.next_invoice_number if company else 1
    reference = f"{prefix}{year}{str(number).zfill(4)}"
    if company:
        company.next_invoice_number = number + 1
        session.add(company)

    credit_note = Invoice(
        company_id=company_id,
        customer_id=original.customer_id,
        project_id=original.project_id,
        quote_id=original.quote_id,
        reference=reference,
        status=InvoiceStatus.DRAFT,
        description=f"Avoir sur facture {original.reference}",
        invoice_date=date.today(),
        due_date=date.today() + timedelta(days=30),
        notes=f"Avoir relatif à la facture {original.reference}",
        payment_terms=original.payment_terms,
        bank_details=original.bank_details,
        conditions=original.conditions,
        invoice_type="credit_note",
        original_invoice_id=original.id,
        created_by_id=current_user.id,
    )
    session.add(credit_note)
    session.commit()
    session.refresh(credit_note)

    # Copier les lignes en inversant les montants (quantité négative)
    original_items = session.exec(
        select(LineItem).where(LineItem.invoice_id == original.id).order_by(LineItem.display_order)
    ).all()
    for item in original_items:
        new_item = LineItem(
            invoice_id=credit_note.id,
            description=item.description,
            long_description=item.long_description,
            item_type=item.item_type,
            quantity=-abs(item.quantity),  # Quantité négative pour un avoir
            unit=item.unit,
            unit_price=item.unit_price,
            discount=item.discount,
            discount_percent=item.discount_percent,
            tax_rate=item.tax_rate,
            reference=item.reference,
            brand=item.brand,
            model=item.model,
            display_order=item.display_order,
        )
        session.add(new_item)
    session.commit()

    return {"success": True, "invoice": get_invoice_response(credit_note, session)}


# ═══════════════════════════════════════════════════════════════════════════════
# BTP FEATURES — Acomptes, Situations, Retenue de garantie
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/from-quote/{quote_id}/situations-summary", response_model=dict)
def get_situations_summary(
    quote_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session),
):
    """
    Retourne un récapitulatif de facturation pour un devis :
    - total du devis HT/TTC
    - % déjà facturé (acomptes + situations)
    - montant déjà facturé
    - liste des factures liées (acomptes + situations + retenue)
    """
    quote = session.get(Quote, quote_id)
    if not quote or quote.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Devis non trouvé")

    # Toutes les factures liées à ce devis
    linked = session.exec(
        select(Invoice).where(Invoice.quote_id == quote_id)
    ).all()

    # Totaux devis
    quote_line_items = session.exec(
        select(LineItem).where(LineItem.quote_id == quote_id)
    ).all()
    quote_total_ht = sum(
        (i.quantity * i.unit_price * (1 - (i.discount_percent or Decimal(0)) / 100))
        for i in quote_line_items
    )

    billed_total = Decimal(0)
    billed_percent = Decimal(0)
    deposit_invoice = None
    situations = []
    retention_invoices = []

    for inv in linked:
        inv_data = get_invoice_response(inv, session)
        if inv.invoice_type == "deposit":
            billed_total += Decimal(str(inv_data["totalHt"]))
            deposit_invoice = inv_data
        elif inv.invoice_type == "situation":
            billed_total += Decimal(str(inv_data["totalHt"]))
            if inv.situation_percent:
                billed_percent += inv.situation_percent
            situations.append(inv_data)
        elif inv.invoice_type == "retention_release":
            retention_invoices.append(inv_data)

    # Percent from deposit
    if deposit_invoice and quote_total_ht > 0:
        dp = Decimal(str(deposit_invoice.get("depositPercent") or 0))
        billed_percent += dp

    remaining_percent = max(Decimal(0), Decimal(100) - billed_percent)
    remaining_ht = max(Decimal(0), quote_total_ht - billed_total)

    return {
        "success": True,
        "summary": {
            "quoteTotalHt": float(quote_total_ht),
            "billedTotal": float(billed_total),
            "billedPercent": float(billed_percent),
            "remainingPercent": float(remaining_percent),
            "remainingHt": float(remaining_ht),
            "depositInvoice": deposit_invoice,
            "situations": sorted(situations, key=lambda x: x.get("situationNumber") or 0),
            "retentionInvoices": retention_invoices,
        },
    }


class DepositInvoiceCreate(SQLModel if False else object):
    pass


@router.post("/from-quote/{quote_id}/deposit", response_model=dict)
def create_deposit_invoice(
    quote_id: int,
    body: dict = Body(...),
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session),
):
    """
    Crée une facture d'acompte depuis un devis accepté.

    Body: { deposit_percent: float, due_date?: str, notes?: str, retention_percent?: float }
    """
    quote = session.get(Quote, quote_id)
    if not quote or quote.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Devis non trouvé")

    deposit_pct = Decimal(str(body.get("deposit_percent", 30)))
    if deposit_pct <= 0 or deposit_pct > 100:
        raise HTTPException(status_code=400, detail="Le pourcentage d'acompte doit être entre 1 et 100")

    # Vérifier qu'il n'y a pas déjà un acompte
    existing_deposit = session.exec(
        select(Invoice).where(Invoice.quote_id == quote_id, Invoice.invoice_type == "deposit")
    ).first()
    if existing_deposit:
        raise HTTPException(status_code=400, detail="Une facture d'acompte existe déjà pour ce devis")

    # Calcul du montant de l'acompte à partir des lignes du devis
    quote_items = session.exec(
        select(LineItem).where(LineItem.quote_id == quote_id)
    ).all()
    quote_ht = sum(
        (i.quantity * i.unit_price * (1 - (i.discount_percent or Decimal(0)) / 100))
        for i in quote_items
    )
    deposit_ht = (quote_ht * deposit_pct / 100).quantize(Decimal("0.01"))

    company = session.get(Company, current_user.company_id)
    reference = generate_invoice_reference(session, current_user.company_id)

    due_date_str = body.get("due_date")
    due_date = date.fromisoformat(due_date_str) if due_date_str else date.today() + timedelta(days=30)
    retention_pct = Decimal(str(body.get("retention_percent", 0))) or None

    invoice = Invoice(
        company_id=current_user.company_id,
        customer_id=quote.customer_id,
        project_id=quote.project_id,
        quote_id=quote_id,
        reference=reference,
        status=InvoiceStatus.DRAFT,
        description=f"Acompte {float(deposit_pct):.0f}% — {quote.description or quote.reference}",
        invoice_date=date.today(),
        due_date=due_date,
        invoice_type="deposit",
        deposit_percent=deposit_pct,
        retention_percent=retention_pct if retention_pct and retention_pct > 0 else None,
        payment_terms=body.get("notes") or (company.default_payment_terms if company else None),
        bank_details=_default_bank_details(company),
        conditions=company.default_conditions if company else None,
        created_by_id=current_user.id,
    )
    session.add(invoice)
    session.commit()
    session.refresh(invoice)

    # Créer une seule ligne : "Acompte X% sur devis DEV2026XXXX"
    # Taux TVA = taux dominant des lignes du devis (ou 20%)
    dominant_tva = Decimal(20)
    if quote_items:
        from collections import Counter
        tva_counts = Counter(float(i.tax_rate) for i in quote_items)
        dominant_tva = Decimal(str(tva_counts.most_common(1)[0][0]))

    line = LineItem(
        invoice_id=invoice.id,
        description=f"Acompte {float(deposit_pct):.0f}% — Devis {quote.reference}",
        item_type=LineItemType.SUPPLY,
        quantity=Decimal(1),
        unit="forf.",
        unit_price=deposit_ht,
        tax_rate=dominant_tva,
        display_order=0,
    )
    session.add(line)
    session.commit()

    return {"success": True, "invoice": get_invoice_response(invoice, session)}


@router.post("/from-quote/{quote_id}/situation", response_model=dict)
def create_situation_invoice(
    quote_id: int,
    body: dict = Body(...),
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session),
):
    """
    Crée une facture de situation (avancement travaux).

    Body: {
        situation_percent: float,        # % de cette situation
        due_date?: str,
        notes?: str,
        retention_percent?: float,       # 5 par défaut si BTP
        line_items?: list                # optionnel, si détail par poste
    }
    """
    quote = session.get(Quote, quote_id)
    if not quote or quote.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Devis non trouvé")

    situation_pct = Decimal(str(body.get("situation_percent", 0)))
    if situation_pct <= 0 or situation_pct > 100:
        raise HTTPException(status_code=400, detail="Le pourcentage de situation doit être entre 1 et 100")

    # Récupérer les situations existantes pour calculer le cumul
    previous_situations = session.exec(
        select(Invoice).where(
            Invoice.quote_id == quote_id,
            Invoice.invoice_type == "situation",
        )
    ).all()
    situation_number = len(previous_situations) + 1

    # Cumul previous
    prev_cumul = sum(
        (inv.situation_percent or Decimal(0)) for inv in previous_situations
    )
    # Ajouter aussi l'acompte dans le cumul
    deposit_inv = session.exec(
        select(Invoice).where(Invoice.quote_id == quote_id, Invoice.invoice_type == "deposit")
    ).first()
    if deposit_inv and deposit_inv.deposit_percent:
        prev_cumul += deposit_inv.deposit_percent

    new_cumulative = prev_cumul + situation_pct
    if new_cumulative > Decimal(100):
        raise HTTPException(
            status_code=400,
            detail=f"Ce pourcentage dépasserait 100 % (déjà facturé : {float(prev_cumul):.1f}%)",
        )

    # Montant HT de la situation
    quote_items = session.exec(select(LineItem).where(LineItem.quote_id == quote_id)).all()
    quote_ht = sum(
        (i.quantity * i.unit_price * (1 - (i.discount_percent or Decimal(0)) / 100))
        for i in quote_items
    )
    situation_ht = (quote_ht * situation_pct / 100).quantize(Decimal("0.01"))

    company = session.get(Company, current_user.company_id)
    reference = generate_invoice_reference(session, current_user.company_id)
    due_date_str = body.get("due_date")
    due_date = date.fromisoformat(due_date_str) if due_date_str else date.today() + timedelta(days=30)
    retention_pct_raw = body.get("retention_percent")
    retention_pct: Optional[Decimal] = Decimal(str(retention_pct_raw)) if retention_pct_raw else None

    invoice = Invoice(
        company_id=current_user.company_id,
        customer_id=quote.customer_id,
        project_id=quote.project_id,
        quote_id=quote_id,
        reference=reference,
        status=InvoiceStatus.DRAFT,
        description=f"Situation n°{situation_number} — {float(situation_pct):.0f}% — {quote.description or quote.reference}",
        invoice_date=date.today(),
        due_date=due_date,
        invoice_type="situation",
        situation_number=situation_number,
        situation_percent=situation_pct,
        cumulative_percent=new_cumulative,
        retention_percent=retention_pct if retention_pct and retention_pct > 0 else None,
        payment_terms=body.get("notes") or (company.default_payment_terms if company else None),
        bank_details=_default_bank_details(company),
        conditions=company.default_conditions if company else None,
        created_by_id=current_user.id,
    )
    session.add(invoice)
    session.commit()
    session.refresh(invoice)

    # Lignes personnalisées ou ligne synthétique
    custom_items = body.get("line_items")
    if custom_items:
        for i, item_data in enumerate(custom_items):
            raw_type = item_data.get("item_type") or "supply"
            try:
                resolved_type = LineItemType(raw_type)
            except ValueError:
                resolved_type = LineItemType.SUPPLY
            line = LineItem(
                invoice_id=invoice.id,
                description=item_data.get("designation") or item_data.get("description") or "",
                item_type=resolved_type,
                quantity=Decimal(str(item_data.get("quantity") or 1)),
                unit=item_data.get("unit", "u"),
                unit_price=Decimal(str(item_data.get("unit_price") or 0)),
                tax_rate=Decimal(str(item_data.get("vat_rate") or 20)),
                display_order=i,
            )
            session.add(line)
    else:
        # Taux TVA dominant du devis
        from collections import Counter
        dominant_tva = Decimal(20)
        if quote_items:
            tva_counts = Counter(float(i.tax_rate) for i in quote_items)
            dominant_tva = Decimal(str(tva_counts.most_common(1)[0][0]))

        line = LineItem(
            invoice_id=invoice.id,
            description=f"Situation n°{situation_number} ({float(situation_pct):.0f}%) — Devis {quote.reference}",
            long_description=f"Avancement cumulé : {float(new_cumulative):.1f}%",
            item_type=LineItemType.SUPPLY,
            quantity=Decimal(1),
            unit="forf.",
            unit_price=situation_ht,
            tax_rate=dominant_tva,
            display_order=0,
        )
        session.add(line)

    session.commit()

    return {"success": True, "invoice": get_invoice_response(invoice, session)}


@router.post("/{invoice_id}/release-retention", response_model=dict)
def release_retention(
    invoice_id: int,
    body: dict = Body(default={}),
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session),
):
    """
    Libère la retenue de garantie d'une facture en créant une facture de
    libération de retenue (invoice_type = 'retention_release').
    Typiquement émise 1 an après réception des travaux.
    """
    origin = session.get(Invoice, invoice_id)
    if not origin or origin.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    if not origin.retention_percent or origin.retention_percent <= 0:
        raise HTTPException(status_code=400, detail="Cette facture n'a pas de retenue de garantie")

    if origin.retention_released:
        raise HTTPException(status_code=400, detail="La retenue de garantie a déjà été libérée")

    if origin.retention_release_invoice_id:
        raise HTTPException(status_code=400, detail="Une facture de libération existe déjà")

    # Calcul du montant de la retenue HT
    origin_response = get_invoice_response(origin, session)
    retention_ht = Decimal(str(origin_response["totalHt"])) * origin.retention_percent / 100

    company = session.get(Company, current_user.company_id)
    reference = generate_invoice_reference(session, current_user.company_id)
    due_date_str = body.get("due_date")
    due_date = date.fromisoformat(due_date_str) if due_date_str else date.today() + timedelta(days=30)

    # Taux TVA de la facture d'origine
    origin_items = session.exec(
        select(LineItem).where(LineItem.invoice_id == invoice_id)
    ).all()
    from collections import Counter
    dominant_tva = Decimal(20)
    if origin_items:
        tva_counts = Counter(float(i.tax_rate) for i in origin_items)
        dominant_tva = Decimal(str(tva_counts.most_common(1)[0][0]))

    release_invoice = Invoice(
        company_id=current_user.company_id,
        customer_id=origin.customer_id,
        project_id=origin.project_id,
        quote_id=origin.quote_id,
        reference=reference,
        status=InvoiceStatus.DRAFT,
        description=f"Libération retenue de garantie — {origin.reference}",
        invoice_date=date.today(),
        due_date=due_date,
        invoice_type="retention_release",
        original_invoice_id=invoice_id,
        notes=body.get("notes") or f"Libération de la retenue de garantie ({float(origin.retention_percent):.0f}%) "
              f"relative à la facture {origin.reference}.",
        payment_terms=company.default_payment_terms if company else None,
        bank_details=_default_bank_details(company),
        conditions=company.default_conditions if company else None,
        created_by_id=current_user.id,
    )
    session.add(release_invoice)
    session.commit()
    session.refresh(release_invoice)

    line = LineItem(
        invoice_id=release_invoice.id,
        description=f"Libération retenue de garantie {float(origin.retention_percent):.0f}% — {origin.reference}",
        item_type=LineItemType.SUPPLY,
        quantity=Decimal(1),
        unit="forf.",
        unit_price=retention_ht.quantize(Decimal("0.01")),
        tax_rate=dominant_tva,
        display_order=0,
    )
    session.add(line)

    # Marquer la facture d'origine comme retenue libérée
    origin.retention_released = True
    origin.retention_release_invoice_id = release_invoice.id
    origin.updated_at = datetime.utcnow()
    session.add(origin)
    session.commit()

    return {"success": True, "invoice": get_invoice_response(release_invoice, session)}


# ─── Relances ─────────────────────────────────────────────────────────────────

@router.post("/{invoice_id}/send-reminder", response_model=dict)
def send_reminder(
    invoice_id: int,
    body: dict = Body(default={}),
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session),
) -> dict:
    """Enregistre l'envoi d'une relance pour une facture impayée."""
    invoice = session.get(Invoice, invoice_id)
    if not invoice or invoice.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    if invoice.status not in (InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE):
        raise HTTPException(status_code=400, detail="La relance n'est possible que pour les factures impayées")

    invoice.reminder_count = (invoice.reminder_count or 0) + 1
    invoice.last_reminder_at = datetime.utcnow()
    invoice.updated_at = datetime.utcnow()
    session.add(invoice)
    session.commit()
    session.refresh(invoice)
    return {"success": True, "reminder_count": invoice.reminder_count, "last_reminder_at": invoice.last_reminder_at}


@router.get("/overdue", response_model=dict)
def get_overdue_invoices(
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session),
) -> dict:
    """Liste toutes les factures en retard ou impayées avec statistiques de relance."""
    today = date.today()
    invoices = session.exec(
        select(Invoice).where(
            Invoice.company_id == current_user.company_id,
            Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE]),
        )
    ).all()

    result = []
    total_overdue = Decimal(0)
    total_pending = Decimal(0)

    for inv in invoices:
        resp = get_invoice_response(inv, session)
        remaining = Decimal(str(resp.get("remainingAmount", 0) or 0))
        is_overdue = inv.due_date and inv.due_date < today
        days_overdue = (today - inv.due_date).days if is_overdue and inv.due_date else 0

        resp["isOverdue"] = is_overdue
        resp["daysOverdue"] = days_overdue
        resp["reminderCount"] = inv.reminder_count or 0
        resp["lastReminderAt"] = inv.last_reminder_at.isoformat() if inv.last_reminder_at else None

        if is_overdue:
            total_overdue += remaining
        else:
            total_pending += remaining

        result.append(resp)

    # Sort: overdue first, then by days overdue desc, then by amount desc
    result.sort(key=lambda x: (-x["isOverdue"], -x["daysOverdue"], -float(x.get("remainingAmount") or 0)))

    return {
        "success": True,
        "invoices": result,
        "stats": {
            "total": len(result),
            "overdue_count": sum(1 for r in result if r["isOverdue"]),
            "pending_count": sum(1 for r in result if not r["isOverdue"]),
            "total_overdue_amount": float(total_overdue),
            "total_pending_amount": float(total_pending),
            "total_amount": float(total_overdue + total_pending),
        },
    }



def download_invoice_pdf(
    invoice_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Génère et télécharge le PDF d'une facture."""
    if not HAS_REPORTLAB:
        raise HTTPException(status_code=500, detail="reportlab non installé.")

    invoice = session.get(Invoice, invoice_id)
    if not invoice or invoice.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    company_obj = session.get(Company, invoice.company_id) if invoice.company_id else None
    customer_obj = session.get(Customer, invoice.customer_id) if invoice.customer_id else None

    co = _build_company_pdf_data(company_obj)

    cu = _build_customer_pdf_data(session, customer_obj)

    db_items = session.exec(
        select(LineItem).where(LineItem.invoice_id == invoice.id).order_by(LineItem.display_order)
    ).all()

    line_items = [
        LineItemData(
            designation=item.description or "",
            long_description=item.long_description or "",
            section=item.section or "",
            quantity=float(item.quantity),
            unit=item.unit or "u",
            unit_price=float(item.unit_price),
            discount_percent=float(item.discount_percent or 0),
            tax_rate=float(item.tax_rate),
            item_type=item.item_type.value if hasattr(item.item_type, "value") else str(item.item_type),
            reference=item.reference or "",
        )
        for item in db_items
    ]

    data = QuoteData(
        doc_type="invoice",
        reference=invoice.reference,
        status=invoice.status.value if hasattr(invoice.status, "value") else str(invoice.status),
        quote_date=invoice.invoice_date.strftime("%d/%m/%Y") if invoice.invoice_date else "",
        expiry_date=invoice.due_date.strftime("%d/%m/%Y") if invoice.due_date else "",
        subject=invoice.description or "",
        notes=invoice.notes or "",
        conditions=invoice.conditions or (company_obj.default_conditions if company_obj else "") or "",
        payment_terms=invoice.payment_terms or (company_obj.default_payment_terms if company_obj else "") or "",
        bank_details=invoice.bank_details or _default_bank_details(company_obj) or "",
        legal_mentions=(company_obj.legal_mentions if company_obj else "") or "",
        line_items=line_items,
        company=co,
        customer=cu,
    )

    try:
        pdf_bytes = generate_invoice_pdf(data)
    except Exception as exc:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erreur PDF : {exc}")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="facture-{invoice.reference}.pdf"'
        },
    )


@router.get("/{invoice_id}/facturx-pdf")
def download_facturx_pdf(
    invoice_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session),
):
    """
    Génère un PDF Factur-X (PDF/A-3 + XML embarqué) conforme à la norme
    française de facturation électronique (EN 16931, Factur-X BASIC WL).

    Ce endpoint produit un document légalement valide pour le dépôt sur
    Chorus Pro ou toute plateforme de dématérialisation partenaire (PDP).
    """
    if not HAS_REPORTLAB:
        raise HTTPException(status_code=500, detail="reportlab non installé.")
    if not HAS_FACTURX:
        raise HTTPException(status_code=500, detail="factur-x non installé.")

    invoice = session.get(Invoice, invoice_id)
    if not invoice or invoice.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    company_obj = session.get(Company, invoice.company_id) if invoice.company_id else None
    customer_obj = session.get(Customer, invoice.customer_id) if invoice.customer_id else None

    # 1. Générer le PDF classique
    co = _build_company_pdf_data(company_obj)

    cu = _build_customer_pdf_data(session, customer_obj)

    db_items = session.exec(
        select(LineItem).where(LineItem.invoice_id == invoice.id).order_by(LineItem.display_order)
    ).all()

    pdf_line_items = [
        LineItemData(
            designation=item.description or "",
            long_description=item.long_description or "",
            section=item.section or "",
            quantity=float(item.quantity),
            unit=item.unit or "u",
            unit_price=float(item.unit_price),
            discount_percent=float(item.discount_percent or 0),
            tax_rate=float(item.tax_rate),
            item_type=item.item_type.value if hasattr(item.item_type, "value") else str(item.item_type),
            reference=item.reference or "",
        )
        for item in db_items
    ]

    pdf_data = QuoteData(
        doc_type="invoice",
        reference=invoice.reference,
        status=invoice.status.value if hasattr(invoice.status, "value") else str(invoice.status),
        quote_date=invoice.invoice_date.strftime("%d/%m/%Y") if invoice.invoice_date else "",
        expiry_date=invoice.due_date.strftime("%d/%m/%Y") if invoice.due_date else "",
        subject=invoice.description or "",
        notes=invoice.notes or "",
        conditions=invoice.conditions or (company_obj.default_conditions if company_obj else "") or "",
        payment_terms=invoice.payment_terms or (company_obj.default_payment_terms if company_obj else "") or "",
        bank_details=invoice.bank_details or _default_bank_details(company_obj) or "",
        legal_mentions=(company_obj.legal_mentions if company_obj else "") or "",
        line_items=pdf_line_items,
        company=co,
        customer=cu,
    )

    try:
        base_pdf = generate_invoice_pdf(pdf_data)
    except Exception as exc:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erreur génération PDF : {exc}")

    # 2. Construire les données Factur-X et embarquer le XML
    try:
        facturx_invoice = build_facturx_invoice_from_db(
            invoice_obj=invoice,
            company_obj=company_obj,
            customer_obj=customer_obj,
            line_items=db_items,
        )
        facturx_bytes = generate_facturx_pdf(base_pdf, facturx_invoice)
    except Exception as exc:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erreur Factur-X : {exc}")

    # 3. Mettre à jour le statut e-invoicing
    invoice.facturx_status = "generated"
    invoice.updated_at = datetime.utcnow()
    session.add(invoice)
    session.commit()

    type_label = "avoir" if invoice.invoice_type == "credit_note" else "facture"
    return Response(
        content=facturx_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{type_label}-{invoice.reference}-facturx.pdf"'
        },
    )


@router.get("/{invoice_id}/facturx-xml")
def download_facturx_xml(
    invoice_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session),
):
    """Télécharge le XML Factur-X seul (pour envoi via PDP / Chorus Pro)."""
    invoice = session.get(Invoice, invoice_id)
    if not invoice or invoice.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    company_obj = session.get(Company, invoice.company_id) if invoice.company_id else None
    customer_obj = session.get(Customer, invoice.customer_id) if invoice.customer_id else None

    db_items = session.exec(
        select(LineItem).where(LineItem.invoice_id == invoice.id).order_by(LineItem.display_order)
    ).all()

    from app.services.facturx_service import generate_facturx_xml

    facturx_invoice = build_facturx_invoice_from_db(
        invoice_obj=invoice,
        company_obj=company_obj,
        customer_obj=customer_obj,
        line_items=db_items,
    )
    xml_bytes = generate_facturx_xml(facturx_invoice)

    return Response(
        content=xml_bytes,
        media_type="application/xml",
        headers={
            "Content-Disposition": f'attachment; filename="facturx-{invoice.reference}.xml"'
        },
    )
