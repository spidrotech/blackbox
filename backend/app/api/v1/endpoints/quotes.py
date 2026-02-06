from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal

from app.db.session import get_session
from app.models import (
    Quote, QuoteCreate, QuoteUpdate,
    LineItem, Customer, Project, Company, User
)
from app.models.enums import QuoteStatus
from app.core.security import get_current_user_required

router = APIRouter()


def generate_quote_reference(session: Session, company_id: int) -> str:
    """Génère une référence unique pour le devis"""
    company = session.get(Company, company_id)
    year = datetime.now().year
    prefix = company.quote_prefix if company else "DE"
    number = company.next_quote_number if company else 1
    
    reference = f"{prefix}{year}{str(number).zfill(4)}"
    
    # Incrémenter le compteur
    if company:
        company.next_quote_number = number + 1
        session.add(company)
    
    return reference


def get_quote_response(quote: Quote, session: Session) -> dict:
    """Formatte la réponse devis"""
    customer = None
    if quote.customer_id:
        cust = session.get(Customer, quote.customer_id)
        if cust:
            customer = {"id": cust.id, "name": cust.name, "email": cust.email}
    
    # Récupérer les lignes
    statement = select(LineItem).where(LineItem.quote_id == quote.id).order_by(LineItem.display_order)
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
            "longDescription": item.long_description,
            "itemType": item.item_type.value,
            "quantity": float(item.quantity),
            "unit": item.unit,
            "unitPrice": float(item.unit_price),
            "discount": float(item.discount) if item.discount else None,
            "discountPercent": float(item.discount_percent) if item.discount_percent else None,
            "taxRate": float(item.tax_rate),
            "totalHt": float(item_ht),
            "totalTva": float(item_tva),
            "displayOrder": item.display_order,
        })
    
    total_ttc = total_ht + total_tva
    
    return {
        "id": quote.id,
        "companyId": quote.company_id,
        "customerId": quote.customer_id,
        "projectId": quote.project_id,
        "reference": quote.reference,
        "status": quote.status.value,
        "description": quote.description,
        "quoteDate": quote.quote_date.isoformat() if quote.quote_date else None,
        "expiryDate": quote.expiry_date.isoformat() if quote.expiry_date else None,
        "acceptedDate": quote.accepted_date.isoformat() if quote.accepted_date else None,
        "signedDate": quote.signed_date.isoformat() if quote.signed_date else None,
        "workStartDate": quote.work_start_date.isoformat() if quote.work_start_date else None,
        "estimatedDuration": quote.estimated_duration,
        "depositPercent": float(quote.deposit_percent) if quote.deposit_percent else None,
        "depositAmount": float(quote.deposit_amount) if quote.deposit_amount else None,
        "notes": quote.notes,
        "paymentTerms": quote.payment_terms,
        "conditions": quote.conditions,
        "totalHt": float(total_ht),
        "totalTva": float(total_tva),
        "totalTtc": float(total_ttc),
        "total": float(total_ttc),
        "createdAt": quote.created_at.isoformat(),
        "customer": customer,
        "lineItems": items,
    }


@router.get("/", response_model=dict)
def list_quotes(
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste tous les devis de l'entreprise"""
    statement = select(Quote).where(Quote.company_id == current_user.company_id)
    
    if status:
        statement = statement.where(Quote.status == status)
    
    if customer_id:
        statement = statement.where(Quote.customer_id == customer_id)
    
    if search:
        statement = statement.where(
            (Quote.reference.ilike(f"%{search}%")) |
            (Quote.description.ilike(f"%{search}%"))
        )
    
    statement = statement.order_by(Quote.created_at.desc()).offset(skip).limit(limit)
    quotes = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [get_quote_response(q, session) for q in quotes],
        "items": [get_quote_response(q, session) for q in quotes],
        "quotes": [get_quote_response(q, session) for q in quotes],
        "meta": {"total": len(quotes)}
    }


@router.get("/{quote_id}", response_model=dict)
def get_quote(
    quote_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Récupère un devis par son ID"""
    quote = session.get(Quote, quote_id)
    if not quote or quote.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    return {
        "success": True,
        "quote": get_quote_response(quote, session)
    }


@router.post("/", response_model=dict)
def create_quote(
    quote_data: QuoteCreate,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Crée un nouveau devis"""
    # Vérifier le client
    customer = session.get(Customer, quote_data.customer_id)
    if not customer or customer.company_id != current_user.company_id:
        raise HTTPException(status_code=400, detail="Client non trouvé")
    
    # Générer la référence
    reference = generate_quote_reference(session, current_user.company_id)
    
    quote = Quote(
        company_id=current_user.company_id,
        customer_id=quote_data.customer_id,
        project_id=quote_data.project_id,
        reference=reference,
        status=QuoteStatus.DRAFT,
        description=quote_data.description,
        quote_date=quote_data.quote_date or date.today(),
        expiry_date=quote_data.expiry_date or (date.today() + timedelta(days=30)),
        work_start_date=quote_data.work_start_date,
        estimated_duration=quote_data.estimated_duration,
        worksite_address=quote_data.worksite_address,
        deposit_percent=quote_data.deposit_percent,
        deposit_amount=quote_data.deposit_amount,
        notes=quote_data.notes,
        payment_terms=quote_data.payment_terms,
        conditions=quote_data.conditions,
        created_by_id=current_user.id,
    )
    session.add(quote)
    session.commit()
    session.refresh(quote)
    
    # Ajouter les lignes
    if quote_data.line_items:
        for i, item_data in enumerate(quote_data.line_items):
            line_item = LineItem(
                quote_id=quote.id,
                description=item_data.get("description", ""),
                long_description=item_data.get("longDescription"),
                item_type=item_data.get("itemType", "supply"),
                quantity=Decimal(str(item_data.get("quantity", 1))),
                unit=item_data.get("unit", "u"),
                unit_price=Decimal(str(item_data.get("unitPrice", 0))),
                discount=Decimal(str(item_data["discount"])) if item_data.get("discount") else None,
                discount_percent=Decimal(str(item_data["discountPercent"])) if item_data.get("discountPercent") else None,
                tax_rate=Decimal(str(item_data.get("taxRate", 20))),
                reference=item_data.get("reference"),
                brand=item_data.get("brand"),
                model=item_data.get("model"),
                display_order=i,
            )
            session.add(line_item)
        session.commit()
    
    return {
        "success": True,
        "quote": get_quote_response(quote, session)
    }


@router.put("/{quote_id}", response_model=dict)
def update_quote(
    quote_id: int,
    quote_data: QuoteUpdate,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Met à jour un devis"""
    quote = session.get(Quote, quote_id)
    if not quote or quote.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    update_data = quote_data.model_dump(exclude_unset=True)
    
    # Gérer les lignes séparément
    line_items_data = update_data.pop("line_items", None)
    
    for key, value in update_data.items():
        setattr(quote, key, value)
    
    quote.updated_at = datetime.utcnow()
    session.add(quote)
    
    # Mettre à jour les lignes
    if line_items_data is not None:
        # Supprimer les anciennes lignes
        old_items = session.exec(select(LineItem).where(LineItem.quote_id == quote.id)).all()
        for item in old_items:
            session.delete(item)
        
        # Ajouter les nouvelles
        for i, item_data in enumerate(line_items_data):
            line_item = LineItem(
                quote_id=quote.id,
                description=item_data.get("description", ""),
                long_description=item_data.get("longDescription"),
                item_type=item_data.get("itemType", "supply"),
                quantity=Decimal(str(item_data.get("quantity", 1))),
                unit=item_data.get("unit", "u"),
                unit_price=Decimal(str(item_data.get("unitPrice", 0))),
                discount=Decimal(str(item_data["discount"])) if item_data.get("discount") else None,
                discount_percent=Decimal(str(item_data["discountPercent"])) if item_data.get("discountPercent") else None,
                tax_rate=Decimal(str(item_data.get("taxRate", 20))),
                reference=item_data.get("reference"),
                brand=item_data.get("brand"),
                model=item_data.get("model"),
                display_order=i,
            )
            session.add(line_item)
    
    session.commit()
    session.refresh(quote)
    
    return {
        "success": True,
        "quote": get_quote_response(quote, session)
    }


@router.post("/{quote_id}/convert-to-invoice", response_model=dict)
def convert_to_invoice(
    quote_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Convertit un devis en facture"""
    from app.models import Invoice
    from app.models.enums import InvoiceStatus
    
    quote = session.get(Quote, quote_id)
    if not quote or quote.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    if quote.status not in [QuoteStatus.ACCEPTED, QuoteStatus.SIGNED]:
        raise HTTPException(status_code=400, detail="Le devis doit être accepté pour être converti")
    
    # Générer la référence de facture
    company = session.get(Company, current_user.company_id)
    year = datetime.now().year
    prefix = company.invoice_prefix if company else "FA"
    number = company.next_invoice_number if company else 1
    reference = f"{prefix}{year}{str(number).zfill(4)}"
    
    if company:
        company.next_invoice_number = number + 1
        session.add(company)
    
    # Créer la facture
    invoice = Invoice(
        company_id=current_user.company_id,
        customer_id=quote.customer_id,
        project_id=quote.project_id,
        quote_id=quote.id,
        reference=reference,
        status=InvoiceStatus.DRAFT,
        description=quote.description,
        invoice_date=date.today(),
        due_date=date.today() + timedelta(days=30),
        notes=quote.notes,
        payment_terms=quote.payment_terms,
        created_by_id=current_user.id,
    )
    session.add(invoice)
    session.commit()
    session.refresh(invoice)
    
    # Copier les lignes
    quote_items = session.exec(select(LineItem).where(LineItem.quote_id == quote.id)).all()
    for item in quote_items:
        new_item = LineItem(
            invoice_id=invoice.id,
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
    
    return {
        "success": True,
        "invoice": {"id": invoice.id, "reference": invoice.reference}
    }


@router.delete("/{quote_id}", response_model=dict)
def delete_quote(
    quote_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Supprime un devis"""
    quote = session.get(Quote, quote_id)
    if not quote or quote.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    # Supprimer les lignes
    items = session.exec(select(LineItem).where(LineItem.quote_id == quote.id)).all()
    for item in items:
        session.delete(item)
    
    session.delete(quote)
    session.commit()
    
    return {"success": True, "message": "Devis supprimé"}
