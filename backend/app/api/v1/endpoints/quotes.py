from fastapi import APIRouter, Depends, HTTPException, Query  # type: ignore
from fastapi.responses import FileResponse  # type: ignore
from sqlmodel import Session, select, col  # type: ignore
from sqlalchemy import desc  # type: ignore
from typing import List, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal
from io import BytesIO
import base64

from app.db.session import get_session
from app.models import (
    Quote, QuoteCreate, QuoteUpdate,
    LineItem, Customer, Project, Company, User
)
from app.models.enums import QuoteStatus, LineItemType
from app.core.security import get_current_user_required
from app.services.pdf_service import (
    HAS_REPORTLAB,
    CompanyData,
    CustomerData,
    LineItemData,
    QuoteData,
    generate_quote_pdf,
)

router = APIRouter()


def generate_quote_reference(session: Session, company_id: Optional[int]) -> str:
    """Génère une référence unique pour le devis

    Accepte un `company_id` optionnel pour éviter les erreurs de typage
    lorsque l'ID n'est pas présent sur l'objet utilisateur pendant
    l'analyse statique (Pylance). Si `company_id` est None, on utilise
    des valeurs par défaut.
    """
    company = session.get(Company, company_id) if company_id is not None else None
    year = datetime.now().year
    prefix = "DE"
    number = 1
    if company:
        prefix = getattr(company, "quote_prefix", "DE") or "DE"
        number = getattr(company, "next_quote_number", 1) or 1
    
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
            "long_description": item.long_description,
            "section": item.section,
            "item_type": item.item_type.value if hasattr(item.item_type, "value") else str(item.item_type),
            "quantity": float(item.quantity),
            "unit": item.unit,
            "unit_price": float(item.unit_price),
            "discount": float(item.discount) if item.discount else None,
            "discount_percent": float(item.discount_percent) if item.discount_percent else None,
            "vat_rate": float(item.tax_rate),
            "reference": item.reference,
            "brand": item.brand,
            "total_ht": float(item_ht),
            "total_tva": float(item_tva),
            "display_order": item.display_order,
        })
    
    total_ttc = total_ht + total_tva
    
    # Calcul acompte et primes
    deposit_amount_calculated: Optional[float] = None
    if quote.deposit_percent and total_ttc:
        deposit_amount_calculated = float(total_ttc * quote.deposit_percent / 100)
    elif quote.deposit_amount:
        deposit_amount_calculated = float(quote.deposit_amount)

    cee = float(quote.cee_premium) if quote.cee_premium else 0.0
    mpr = float(quote.mpr_premium) if quote.mpr_premium else 0.0
    net_after_premiums = float(total_ttc) - cee - mpr

    return {
        "id": quote.id,
        "company_id": quote.company_id,
        "customer_id": quote.customer_id,
        "project_id": quote.project_id,
        "reference": quote.reference,
        "status": quote.status.value if hasattr(quote.status, "value") else str(quote.status),
        "subject": quote.description,
        "description": quote.description,
        "quote_date": quote.quote_date.isoformat() if quote.quote_date else None,
        "expiry_date": quote.expiry_date.isoformat() if quote.expiry_date else None,
        "accepted_date": quote.accepted_date.isoformat() if quote.accepted_date else None,
        "signed_date": quote.signed_date.isoformat() if quote.signed_date else None,
        "finalized_date": quote.finalized_date.isoformat() if quote.finalized_date else None,
        "work_start_date": quote.work_start_date.isoformat() if quote.work_start_date else None,
        "estimated_duration": quote.estimated_duration,
        "worksite_address": quote.worksite_address,
        "deposit_percent": float(quote.deposit_percent) if quote.deposit_percent else None,
        "deposit_amount": float(quote.deposit_amount) if quote.deposit_amount else deposit_amount_calculated,
        "global_discount_percent": float(quote.global_discount_percent) if quote.global_discount_percent else None,
        "global_discount": float(quote.global_discount) if quote.global_discount else None,
        "cee_premium": cee if cee else None,
        "mpr_premium": mpr if mpr else None,
        "net_after_premiums": net_after_premiums,
        "notes": quote.notes,
        "payment_terms": quote.payment_terms,
        "conditions": quote.conditions,
        "footer_notes": quote.footer_notes,
        "bank_details": quote.bank_details,
        "legal_mentions": quote.legal_mentions,
        "waste_management": quote.waste_management,
        "total_ht": float(total_ht),
        "total_tva": float(total_tva),
        "total_ttc": float(total_ttc),
        "total": float(total_ttc),
        "created_at": quote.created_at.isoformat(),
        "customer": customer,
        "line_items": items,
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
            (col(Quote.reference).ilike(f"%{search}%")) |  # type: ignore
            (col(Quote.description).ilike(f"%{search}%"))  # type: ignore
        )
    
    statement = statement.order_by(desc(Quote.created_at)).offset(skip).limit(limit)
    quotes = session.exec(statement).all()
    
    data = [get_quote_response(q, session) for q in quotes]
    return {
        "success": True,
        "data": data,
        "items": data,
        "quotes": data,
        "meta": {"total": len(quotes)}
    }


@router.get("/stats", response_model=dict)
def get_quote_stats(
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session),
):
    """Statistiques globales des devis"""
    all_quotes = session.exec(
        select(Quote).where(Quote.company_id == current_user.company_id)
    ).all()

    stats: dict = {
        "total": len(all_quotes),
        "draft": 0, "sent": 0, "viewed": 0, "signed": 0,
        "accepted": 0, "rejected": 0, "expired": 0, "cancelled": 0, "finalized": 0,
        "totalAmountHt": 0.0, "totalAmountTtc": 0.0,
        "conversionRate": 0.0, "expiringIn7Days": 0, "expiringIn30Days": 0,
    }

    today = date.today()
    for q in all_quotes:
        status_key = q.status.value if hasattr(q.status, "value") else str(q.status)
        if status_key in stats:
            stats[status_key] = stats.get(status_key, 0) + 1

        db_items = session.exec(
            select(LineItem).where(LineItem.quote_id == q.id)
        ).all()
        q_ht = Decimal(0)
        q_tva = Decimal(0)
        for item in db_items:
            item_ht = item.quantity * item.unit_price
            if item.discount:
                item_ht -= item.discount
            elif item.discount_percent:
                item_ht -= item_ht * item.discount_percent / 100
            q_ht += item_ht
            q_tva += item_ht * item.tax_rate / 100
        stats["totalAmountHt"] += float(q_ht)
        stats["totalAmountTtc"] += float(q_ht + q_tva)

        if q.expiry_date and status_key in ("draft", "sent", "viewed"):
            days_left = (q.expiry_date - today).days
            if 0 <= days_left <= 7:
                stats["expiringIn7Days"] += 1
            if 0 <= days_left <= 30:
                stats["expiringIn30Days"] += 1

    sent_total = (stats["sent"] + stats["viewed"] + stats["signed"]
                  + stats["accepted"] + stats["rejected"] + stats["finalized"])
    if sent_total > 0:
        stats["conversionRate"] = round(
            (stats["accepted"] + stats["signed"] + stats["finalized"]) / sent_total * 100, 1
        )

    return {"success": True, "data": stats}


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

    def _safe_decimal(val: object) -> Optional[Decimal]:
        """Convertit en Decimal en ignorant None/0/chaîne vide."""
        if val is None or val == "" or val == 0:
            return None
        try:
            return Decimal(str(val))
        except Exception:
            return None

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
        deposit_percent=_safe_decimal(quote_data.deposit_percent),
        deposit_amount=_safe_decimal(quote_data.deposit_amount),
        cee_premium=_safe_decimal(getattr(quote_data, 'cee_premium', None)),
        mpr_premium=_safe_decimal(getattr(quote_data, 'mpr_premium', None)),
        notes=quote_data.notes,
        payment_terms=quote_data.payment_terms,
        conditions=quote_data.conditions or quote_data.terms_and_conditions,
        created_by_id=current_user.id,
    )
    session.add(quote)
    session.commit()
    session.refresh(quote)
    
    # Ajouter les lignes
    if quote_data.line_items:
        for i, item_data in enumerate(quote_data.line_items):
            raw_type = (
                item_data.get("item_type")
                or item_data.get("itemType")
                or "supply"
            )
            try:
                resolved_type = LineItemType(raw_type)
            except ValueError:
                resolved_type = LineItemType.SUPPLY

            is_structural = resolved_type in (
                LineItemType.SECTION, LineItemType.TEXT, LineItemType.PAGE_BREAK
            )

            line_item = LineItem(
                quote_id=quote.id,
                description=(
                    item_data.get("designation")
                    or item_data.get("description")
                    or ""
                ),
                long_description=(
                    item_data.get("long_description")
                    or item_data.get("longDescription")
                ),
                item_type=resolved_type,
                quantity=Decimal(str(item_data.get("quantity") or 0)) if is_structural else Decimal(str(item_data.get("quantity") or 1)),
                unit=item_data.get("unit", "u"),
                unit_price=Decimal(str(item_data.get("unit_price") or item_data.get("unitPrice") or 0)),
                discount=Decimal(str(item_data["discount"])) if item_data.get("discount") else None,
                discount_percent=Decimal(
                    str(item_data.get("discount_percent") or item_data.get("discountPercent") or 0)
                ) if (item_data.get("discount_percent") or item_data.get("discountPercent")) else None,
                tax_rate=Decimal(
                    str(item_data.get("vat_rate") or item_data.get("taxRate") or 20)
                ),
                reference=item_data.get("reference"),
                brand=item_data.get("brand"),
                model=item_data.get("model"),
                section=item_data.get("section"),
                display_order=i,
            )
            session.add(line_item)
        session.commit()
    
    return {
        "success": True,
        "quote": get_quote_response(quote, session)
    }


@router.post("/preview-pdf")
def preview_quote_pdf(
    quote_data: QuoteCreate,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session),
):
    """Génère un PDF de prévisualisation (base64) en utilisant le pdf_service professionnel."""
    if not HAS_REPORTLAB:
        raise HTTPException(
            status_code=500,
            detail="reportlab non installé. Installez-le avec : pip install reportlab",
        )

    try:
        company_obj = (
            session.get(Company, current_user.company_id)
            if getattr(current_user, "company_id", None)
            else None
        )
        customer_obj = (
            session.get(Customer, quote_data.customer_id)
            if quote_data.customer_id
            else None
        )

        # Construire CompanyData
        co = CompanyData()
        if company_obj:
            co.name = company_obj.name or ""
            co.address = company_obj.address or ""
            co.city = company_obj.city or ""
            co.postal_code = company_obj.postal_code or ""
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
            co.visuals_json = getattr(company_obj, 'visuals_json', None) or ""

        # Construire CustomerData
        cu = CustomerData()
        if customer_obj:
            cu.name = customer_obj.name or ""
            cu.contact_name = customer_obj.contact_name or ""
            cu.phone = customer_obj.phone or ""
            cu.email = customer_obj.email or ""

        # Numéro de référence estimé
        year = datetime.now().year
        prefix = (company_obj.quote_prefix if company_obj else None) or "DE"
        number = (company_obj.next_quote_number if company_obj else None) or 1
        ref = f"{prefix}{year}{str(number).zfill(4)}"

        quote_date = quote_data.quote_date or date.today()
        validity_days = int(quote_data.validity_days or 30)
        expiry_date = quote_data.expiry_date or (quote_date + timedelta(days=validity_days))

        # Construire les lignes
        line_items: list[LineItemData] = []
        for raw in (quote_data.line_items or []):
            li = LineItemData(
                designation=raw.get("designation") or raw.get("description") or "",
                long_description=raw.get("long_description") or raw.get("longDescription") or "",
                section=raw.get("section") or "",
                quantity=float(raw.get("quantity", 0)),
                unit=raw.get("unit") or "u",
                unit_price=float(raw.get("unit_price") or raw.get("unitPrice") or 0),
                discount_percent=float(raw.get("discount_percent") or raw.get("discountPercent") or 0),
                tax_rate=float(raw.get("vat_rate") or raw.get("taxRate") or 20),
                item_type=raw.get("item_type") or raw.get("itemType") or "supply",
                reference=raw.get("reference") or "",
            )
            line_items.append(li)

        data = QuoteData(
            reference=ref,
            status="draft",
            quote_date=quote_date.strftime("%d/%m/%Y"),
            expiry_date=expiry_date.strftime("%d/%m/%Y"),
            work_start_date=(
                quote_data.work_start_date.strftime("%d/%m/%Y")
                if quote_data.work_start_date
                else ""
            ),
            estimated_duration=quote_data.estimated_duration or "",
            worksite_address=quote_data.worksite_address or "",
            subject=quote_data.subject or quote_data.description or "",
            notes=quote_data.notes or "",
            conditions=quote_data.conditions or quote_data.terms_and_conditions or (company_obj.default_conditions if company_obj else "") or "",
            payment_terms=quote_data.payment_terms or (company_obj.default_payment_terms if company_obj else "") or "",
            legal_mentions=getattr(quote_data, 'legal_mentions', None) or (company_obj.legal_mentions if company_obj else "") or "",
            deposit_percent=float(quote_data.deposit_percent or 0),
            global_discount_percent=float(quote_data.discount_percent or 0),
            cee_premium=float(quote_data.cee_premium or 0),
            mpr_premium=float(quote_data.mpr_premium or 0),
            waste_management_fee=float(quote_data.waste_management_fee or 0),
            line_items=line_items,
            company=co,
            customer=cu,
        )

        pdf_bytes = generate_quote_pdf(data)
        pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")

        return {
            "success": True,
            "data": f"data:application/pdf;base64,{pdf_b64}",
        }

    except Exception as exc:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la génération du PDF : {exc}",
        )


@router.get("/{quote_id}/pdf")
def download_quote_pdf(
    quote_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session),
):
    """Génère et télécharge le PDF final d'un devis sauvegardé."""
    if not HAS_REPORTLAB:
        raise HTTPException(status_code=500, detail="reportlab non installé.")

    quote = session.get(Quote, quote_id)
    if not quote or quote.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Devis non trouvé")

    company_obj = session.get(Company, quote.company_id) if quote.company_id else None
    customer_obj = session.get(Customer, quote.customer_id) if quote.customer_id else None

    co = CompanyData()
    if company_obj:
        co.name = company_obj.name or ""
        co.address = company_obj.address or ""
        co.city = company_obj.city or ""
        co.postal_code = company_obj.postal_code or ""
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
        co.visuals_json = getattr(company_obj, 'visuals_json', None) or ""

    cu = CustomerData()
    if customer_obj:
        cu.name = customer_obj.name or ""
        cu.contact_name = customer_obj.contact_name or ""
        cu.phone = customer_obj.phone or ""
        cu.email = customer_obj.email or ""

    # Charger les lignes depuis la DB
    db_items = session.exec(
        select(LineItem).where(LineItem.quote_id == quote.id).order_by(LineItem.display_order)
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
        reference=quote.reference,
        status=quote.status.value if hasattr(quote.status, "value") else str(quote.status),
        quote_date=quote.quote_date.strftime("%d/%m/%Y") if quote.quote_date else "",
        expiry_date=quote.expiry_date.strftime("%d/%m/%Y") if quote.expiry_date else "",
        work_start_date=quote.work_start_date.strftime("%d/%m/%Y") if quote.work_start_date else "",
        estimated_duration=quote.estimated_duration or "",
        worksite_address=quote.worksite_address or "",
        subject=quote.description or "",
        notes=quote.notes or "",
        conditions=quote.conditions or (company_obj.default_conditions if company_obj else "") or "",
        payment_terms=quote.payment_terms or (company_obj.default_payment_terms if company_obj else "") or "",
        legal_mentions=quote.legal_mentions or (company_obj.legal_mentions if company_obj else "") or "",
        deposit_percent=float(quote.deposit_percent or 0),
        global_discount_percent=float(quote.global_discount_percent or 0),
        cee_premium=float(quote.cee_premium or 0),
        mpr_premium=float(quote.mpr_premium or 0),
        waste_management_fee=0.0,
        line_items=line_items,
        company=co,
        customer=cu,
    )

    try:
        pdf_bytes = generate_quote_pdf(data)
    except Exception as exc:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erreur PDF : {exc}")

    from fastapi.responses import Response
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="devis-{quote.reference}.pdf"'
        },
    )


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
    
    # Alias: terms_and_conditions → conditions, subject → description
    if "terms_and_conditions" in update_data:
        update_data["conditions"] = update_data.pop("terms_and_conditions")
    if "subject" in update_data:
        update_data["description"] = update_data.pop("subject")
    
    for key, value in update_data.items():
        if hasattr(quote, key):
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
            raw_type = item_data.get("item_type") or "supply"
            try:
                resolved_type = LineItemType(raw_type)
            except ValueError:
                resolved_type = LineItemType.SUPPLY
            is_structural = resolved_type in (
                LineItemType.SECTION, LineItemType.TEXT, LineItemType.PAGE_BREAK
            )
            line_item = LineItem(
                quote_id=quote.id,
                description=(
                    item_data.get("designation")
                    or item_data.get("description")
                    or ""
                ),
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
                section=item_data.get("section"),
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


@router.patch("/{quote_id}/status", response_model=dict)
def update_quote_status(
    quote_id: int,
    status: str,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session),
):
    """Change le statut d'un devis"""
    quote = session.get(Quote, quote_id)
    if not quote or quote.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Devis non trouvé")

    try:
        new_status = QuoteStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Statut invalide : {status}")

    quote.status = new_status
    quote.updated_at = datetime.utcnow()

    # Affecter les dates automatiques
    if new_status in (QuoteStatus.ACCEPTED,):
        quote.accepted_date = quote.accepted_date or date.today()
    elif new_status in (QuoteStatus.SIGNED,):
        quote.signed_date = quote.signed_date or date.today()
    elif new_status in (QuoteStatus.FINALIZED,):
        quote.finalized_date = quote.finalized_date or date.today()

    session.add(quote)
    session.commit()
    session.refresh(quote)

    return {"success": True, "quote": get_quote_response(quote, session)}


@router.post("/{quote_id}/send", response_model=dict)
def send_quote(
    quote_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session),
):
    """Marque le devis comme envoyé et génère le PDF en base64 pour envoi email côté frontend"""
    quote = session.get(Quote, quote_id)
    if not quote or quote.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Devis non trouvé")

    if quote.status == QuoteStatus.DRAFT:
        quote.status = QuoteStatus.SENT
        quote.updated_at = datetime.utcnow()
        session.add(quote)
        session.commit()
        session.refresh(quote)

    # Générer le PDF pour la pièce jointe
    pdf_b64: Optional[str] = None
    if HAS_REPORTLAB:
        try:
            company_obj = session.get(Company, quote.company_id) if quote.company_id else None
            customer_obj = session.get(Customer, quote.customer_id) if quote.customer_id else None

            co = CompanyData()
            if company_obj:
                co.name = company_obj.name or ""
                co.address = company_obj.address or ""
                co.city = company_obj.city or ""
                co.postal_code = company_obj.postal_code or ""
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
                co.visuals_json = getattr(company_obj, 'visuals_json', None) or ""

            cu = CustomerData()
            if customer_obj:
                cu.name = customer_obj.name or ""
                cu.contact_name = customer_obj.contact_name or ""
                cu.phone = customer_obj.phone or ""
                cu.email = customer_obj.email or ""

            db_items = session.exec(
                select(LineItem).where(LineItem.quote_id == quote.id).order_by(LineItem.display_order)
            ).all()
            line_items_data = [
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
                reference=quote.reference,
                status=quote.status.value if hasattr(quote.status, "value") else str(quote.status),
                quote_date=quote.quote_date.strftime("%d/%m/%Y") if quote.quote_date else "",
                expiry_date=quote.expiry_date.strftime("%d/%m/%Y") if quote.expiry_date else "",
                work_start_date=quote.work_start_date.strftime("%d/%m/%Y") if quote.work_start_date else "",
                estimated_duration=quote.estimated_duration or "",
                worksite_address=quote.worksite_address or "",
                subject=quote.description or "",
                notes=quote.notes or "",
                conditions=quote.conditions or (company_obj.default_conditions if company_obj else "") or "",
                payment_terms=quote.payment_terms or (company_obj.default_payment_terms if company_obj else "") or "",
                legal_mentions=quote.legal_mentions or (company_obj.legal_mentions if company_obj else "") or "",
                deposit_percent=float(quote.deposit_percent or 0),
                global_discount_percent=float(quote.global_discount_percent or 0),
                cee_premium=float(quote.cee_premium or 0),
                mpr_premium=float(quote.mpr_premium or 0),
                waste_management_fee=0.0,
                line_items=line_items_data,
                company=co,
                customer=cu,
            )
            pdf_bytes = generate_quote_pdf(data)
            pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")
        except Exception as exc:
            import traceback
            print(traceback.format_exc())

    customer_email: Optional[str] = None
    if quote.customer_id:
        cust = session.get(Customer, quote.customer_id)
        if cust:
            customer_email = cust.email

    return {
        "success": True,
        "quote": get_quote_response(quote, session),
        "pdfBase64": f"data:application/pdf;base64,{pdf_b64}" if pdf_b64 else None,
        "customerEmail": customer_email,
        "filename": f"devis-{quote.reference}.pdf",
    }


@router.post("/{quote_id}/duplicate", response_model=dict)
def duplicate_quote(
    quote_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session),
):
    """Duplique un devis en créant un nouveau brouillon"""
    original = session.get(Quote, quote_id)
    if not original or original.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Devis non trouvé")

    new_reference = generate_quote_reference(session, current_user.company_id)

    new_quote = Quote(
        company_id=original.company_id,
        customer_id=original.customer_id,
        project_id=original.project_id,
        reference=new_reference,
        status=QuoteStatus.DRAFT,
        description=original.description,
        quote_date=date.today(),
        expiry_date=date.today() + timedelta(days=30),
        work_start_date=original.work_start_date,
        estimated_duration=original.estimated_duration,
        worksite_address=original.worksite_address,
        deposit_percent=original.deposit_percent,
        deposit_amount=original.deposit_amount,
        global_discount=original.global_discount,
        global_discount_percent=original.global_discount_percent,
        cee_premium=original.cee_premium,
        mpr_premium=original.mpr_premium,
        waste_management=original.waste_management,
        notes=original.notes,
        payment_terms=original.payment_terms,
        conditions=original.conditions,
        footer_notes=original.footer_notes,
        bank_details=original.bank_details,
        legal_mentions=original.legal_mentions,
        payment_methods=original.payment_methods,
        created_by_id=current_user.id,
    )
    session.add(new_quote)
    session.commit()
    session.refresh(new_quote)

    # Copier les lignes
    original_items = session.exec(
        select(LineItem).where(LineItem.quote_id == original.id).order_by(LineItem.display_order)
    ).all()
    for item in original_items:
        new_item = LineItem(
            quote_id=new_quote.id,
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
            section=item.section,
            display_order=item.display_order,
        )
        session.add(new_item)
    session.commit()

    return {"success": True, "quote": get_quote_response(new_quote, session)}
