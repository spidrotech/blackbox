from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime

from app.db.session import get_session
from app.models import (
    Supplier, SupplierCreate, SupplierUpdate,
    Address, User
)
from app.core.security import get_current_user_required

router = APIRouter()


def get_supplier_response(supplier: Supplier, session: Session) -> dict:
    """Formatte la réponse fournisseur"""
    address = None
    if supplier.address_id:
        addr = session.get(Address, supplier.address_id)
        if addr:
            address = {
                "street": addr.street,
                "city": addr.city,
                "postalCode": addr.postal_code,
                "country": addr.country,
            }
    
    return {
        "id": supplier.id,
        "companyId": supplier.company_id,
        "name": supplier.name,
        "type": supplier.type.value,
        "siret": supplier.siret,
        "vatNumber": supplier.vat_number,
        "contactName": supplier.contact_name,
        "email": supplier.email,
        "phone": supplier.phone,
        "website": supplier.website,
        "iban": supplier.iban,
        "bic": supplier.bic,
        "paymentTermsDays": supplier.payment_terms_days,
        "notes": supplier.notes,
        "categories": supplier.categories,
        "defaultDiscount": float(supplier.default_discount) if supplier.default_discount else None,
        "isActive": supplier.is_active,
        "isFavorite": supplier.is_favorite,
        "createdAt": supplier.created_at.isoformat(),
        "address": address,
    }


@router.get("/", response_model=dict)
def list_suppliers(
    search: Optional[str] = None,
    type: Optional[str] = None,
    is_active: bool = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste tous les fournisseurs"""
    statement = select(Supplier).where(Supplier.company_id == current_user.company_id)
    
    if is_active is not None:
        statement = statement.where(Supplier.is_active == is_active)
    
    if type:
        statement = statement.where(Supplier.type == type)
    
    if search:
        statement = statement.where(
            (Supplier.name.ilike(f"%{search}%")) |
            (Supplier.email.ilike(f"%{search}%"))
        )
    
    statement = statement.offset(skip).limit(limit)
    suppliers = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [get_supplier_response(s, session) for s in suppliers],
        "meta": {"total": len(suppliers)}
    }


@router.get("/search", response_model=dict)
def search_suppliers(
    q: str,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Recherche de fournisseurs"""
    statement = select(Supplier).where(
        Supplier.company_id == current_user.company_id,
        Supplier.is_active == True,
        Supplier.name.ilike(f"%{q}%")
    ).limit(20)
    suppliers = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [get_supplier_response(s, session) for s in suppliers]
    }


@router.get("/favorites", response_model=dict)
def list_favorites(
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste les fournisseurs favoris"""
    statement = select(Supplier).where(
        Supplier.company_id == current_user.company_id,
        Supplier.is_favorite == True,
        Supplier.is_active == True
    )
    suppliers = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [get_supplier_response(s, session) for s in suppliers]
    }


@router.get("/{supplier_id}", response_model=dict)
def get_supplier(
    supplier_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Récupère un fournisseur par son ID"""
    supplier = session.get(Supplier, supplier_id)
    if not supplier or supplier.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    
    return {
        "success": True,
        "data": get_supplier_response(supplier, session)
    }


@router.post("/", response_model=dict)
def create_supplier(
    supplier_data: SupplierCreate,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Crée un nouveau fournisseur"""
    # Créer l'adresse si fournie
    address_id = None
    if supplier_data.address:
        addr = supplier_data.address
        address = Address(
            street=addr.get("street", ""),
            city=addr.get("city", ""),
            postal_code=addr.get("postalCode", ""),
            country=addr.get("country", "France"),
        )
        session.add(address)
        session.commit()
        session.refresh(address)
        address_id = address.id
    
    supplier = Supplier(
        company_id=current_user.company_id,
        name=supplier_data.name,
        type=supplier_data.type,
        siret=supplier_data.siret,
        vat_number=supplier_data.vat_number,
        contact_name=supplier_data.contact_name,
        email=supplier_data.email,
        phone=supplier_data.phone,
        website=supplier_data.website,
        iban=supplier_data.iban,
        bic=supplier_data.bic,
        payment_terms_days=supplier_data.payment_terms_days,
        notes=supplier_data.notes,
        categories=supplier_data.categories,
        default_discount=supplier_data.default_discount,
        address_id=address_id,
    )
    session.add(supplier)
    session.commit()
    session.refresh(supplier)
    
    return {
        "success": True,
        "data": get_supplier_response(supplier, session)
    }


@router.put("/{supplier_id}", response_model=dict)
def update_supplier(
    supplier_id: int,
    supplier_data: SupplierUpdate,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Met à jour un fournisseur"""
    supplier = session.get(Supplier, supplier_id)
    if not supplier or supplier.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    
    update_data = supplier_data.model_dump(exclude_unset=True)
    
    # Gérer l'adresse séparément
    if "address" in update_data:
        addr_data = update_data.pop("address")
        if addr_data:
            if supplier.address_id:
                address = session.get(Address, supplier.address_id)
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
                supplier.address_id = address.id
    
    for key, value in update_data.items():
        setattr(supplier, key, value)
    
    supplier.updated_at = datetime.utcnow()
    session.add(supplier)
    session.commit()
    session.refresh(supplier)
    
    return {
        "success": True,
        "data": get_supplier_response(supplier, session)
    }


@router.post("/{supplier_id}/toggle-favorite", response_model=dict)
def toggle_favorite(
    supplier_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Bascule le statut favori d'un fournisseur"""
    supplier = session.get(Supplier, supplier_id)
    if not supplier or supplier.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    
    supplier.is_favorite = not supplier.is_favorite
    session.add(supplier)
    session.commit()
    session.refresh(supplier)
    
    return {
        "success": True,
        "data": get_supplier_response(supplier, session)
    }


@router.delete("/{supplier_id}", response_model=dict)
def delete_supplier(
    supplier_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Supprime (désactive) un fournisseur"""
    supplier = session.get(Supplier, supplier_id)
    if not supplier or supplier.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    
    supplier.is_active = False
    session.add(supplier)
    session.commit()
    
    return {"success": True, "message": "Fournisseur supprimé"}
