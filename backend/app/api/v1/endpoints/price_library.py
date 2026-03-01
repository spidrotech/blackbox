from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from app.db.session import get_session
from app.models import (
    PriceLibraryItem, PriceLibraryItemCreate, PriceLibraryItemUpdate,
    User
)
from app.core.security import get_current_user_required

router = APIRouter()


def get_item_response(item: PriceLibraryItem) -> dict:
    """Formatte la réponse article"""
    return {
        "id": item.id,
        "companyId": item.company_id,
        "name": item.name,
        "description": item.description,
        "longDescription": item.long_description,
        "itemType": item.item_type.value,
        "category": item.category,
        "subcategory": item.subcategory,
        "trade": item.trade,
        "unit": item.unit,
        "unitPrice": float(item.unit_price),
        "taxRate": float(item.tax_rate),
        "reference": item.reference,
        "brand": item.brand,
        "costPrice": float(item.cost_price) if item.cost_price else None,
        "usageCount": item.usage_count,
        "isFavorite": item.is_favorite,
        "isActive": item.is_active,
        "createdAt": item.created_at.isoformat(),
    }


@router.get("/", response_model=dict)
def list_items(
    category: Optional[str] = None,
    search: Optional[str] = None,
    is_active: bool = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste tous les articles de la bibliothèque"""
    statement = select(PriceLibraryItem).where(
        PriceLibraryItem.company_id == current_user.company_id
    )
    
    if is_active is not None:
        statement = statement.where(PriceLibraryItem.is_active == is_active)
    
    if category:
        statement = statement.where(PriceLibraryItem.category == category)
    
    if search:
        statement = statement.where(
            (PriceLibraryItem.name.ilike(f"%{search}%")) |
            (PriceLibraryItem.description.ilike(f"%{search}%")) |
            (PriceLibraryItem.reference.ilike(f"%{search}%"))
        )
    
    statement = statement.offset(skip).limit(limit)
    items = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [get_item_response(i) for i in items],
        "meta": {"total": len(items)}
    }


@router.get("/search", response_model=dict)
def search_items(
    q: Optional[str] = None,
    query: Optional[str] = None,
    limit: int = 20,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Recherche d'articles (accepte 'q' ou 'query' comme paramètre)"""
    search_term = q or query or ""
    if not search_term:
        return {"success": True, "data": []}
    statement = select(PriceLibraryItem).where(
        PriceLibraryItem.company_id == current_user.company_id,
        PriceLibraryItem.is_active == True,
        (PriceLibraryItem.name.ilike(f"%{search_term}%")) |
        (PriceLibraryItem.description.ilike(f"%{search_term}%"))
    ).limit(limit)
    items = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [get_item_response(i) for i in items]
    }


@router.get("/favorites", response_model=dict)
def list_favorites(
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste les articles favoris"""
    statement = select(PriceLibraryItem).where(
        PriceLibraryItem.company_id == current_user.company_id,
        PriceLibraryItem.is_favorite == True,
        PriceLibraryItem.is_active == True
    )
    items = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [get_item_response(i) for i in items]
    }


@router.get("/most-used", response_model=dict)
def most_used(
    limit: int = 20,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste les articles les plus utilisés"""
    statement = select(PriceLibraryItem).where(
        PriceLibraryItem.company_id == current_user.company_id,
        PriceLibraryItem.is_active == True
    ).order_by(PriceLibraryItem.usage_count.desc()).limit(limit)
    items = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [get_item_response(i) for i in items]
    }


@router.get("/categories", response_model=dict)
def list_categories(
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste les catégories"""
    statement = select(PriceLibraryItem.category).where(
        PriceLibraryItem.company_id == current_user.company_id,
        PriceLibraryItem.category != None
    ).distinct()
    categories = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [c for c in categories if c]
    }


@router.get("/categories/{category}/subcategories", response_model=dict)
def list_subcategories(
    category: str,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste les sous-catégories d'une catégorie"""
    statement = select(PriceLibraryItem.subcategory).where(
        PriceLibraryItem.company_id == current_user.company_id,
        PriceLibraryItem.category == category,
        PriceLibraryItem.subcategory != None
    ).distinct()
    subcategories = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [s for s in subcategories if s]
    }


@router.get("/trades", response_model=dict)
def list_trades(
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste les corps de métier"""
    statement = select(PriceLibraryItem.trade).where(
        PriceLibraryItem.company_id == current_user.company_id,
        PriceLibraryItem.trade != None
    ).distinct()
    trades = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [t for t in trades if t]
    }


@router.get("/{item_id}", response_model=dict)
def get_item(
    item_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Récupère un article par son ID"""
    item = session.get(PriceLibraryItem, item_id)
    if not item or item.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    
    return {
        "success": True,
        "data": get_item_response(item)
    }


@router.post("/", response_model=dict)
def create_item(
    item_data: PriceLibraryItemCreate,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Crée un nouvel article"""
    item = PriceLibraryItem(
        company_id=current_user.company_id,
        name=item_data.name,
        description=item_data.description,
        long_description=item_data.long_description,
        item_type=item_data.item_type,
        category=item_data.category,
        subcategory=item_data.subcategory,
        trade=item_data.trade,
        unit=item_data.unit,
        unit_price=item_data.unit_price,
        tax_rate=item_data.tax_rate,
        reference=item_data.reference,
        brand=item_data.brand,
        cost_price=item_data.cost_price,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    
    return {
        "success": True,
        "data": get_item_response(item)
    }


@router.put("/{item_id}", response_model=dict)
def update_item(
    item_id: int,
    item_data: PriceLibraryItemUpdate,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Met à jour un article"""
    item = session.get(PriceLibraryItem, item_id)
    if not item or item.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    
    update_data = item_data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(item, key, value)
    
    item.updated_at = datetime.utcnow()
    session.add(item)
    session.commit()
    session.refresh(item)
    
    return {
        "success": True,
        "data": get_item_response(item)
    }


@router.post("/{item_id}/duplicate", response_model=dict)
def duplicate_item(
    item_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Duplique un article"""
    item = session.get(PriceLibraryItem, item_id)
    if not item or item.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    
    new_item = PriceLibraryItem(
        company_id=current_user.company_id,
        name=f"{item.name} (copie)",
        description=item.description,
        long_description=item.long_description,
        item_type=item.item_type,
        category=item.category,
        subcategory=item.subcategory,
        trade=item.trade,
        unit=item.unit,
        unit_price=item.unit_price,
        tax_rate=item.tax_rate,
        reference=item.reference,
        brand=item.brand,
        cost_price=item.cost_price,
    )
    session.add(new_item)
    session.commit()
    session.refresh(new_item)
    
    return {
        "success": True,
        "data": get_item_response(new_item)
    }


@router.post("/{item_id}/toggle-favorite", response_model=dict)
def toggle_favorite(
    item_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Bascule le statut favori"""
    item = session.get(PriceLibraryItem, item_id)
    if not item or item.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    
    item.is_favorite = not item.is_favorite
    session.add(item)
    session.commit()
    session.refresh(item)
    
    return {
        "success": True,
        "data": get_item_response(item)
    }


@router.post("/{item_id}/use", response_model=dict)
def use_item(
    item_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Incrémente le compteur d'utilisation"""
    item = session.get(PriceLibraryItem, item_id)
    if not item or item.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    
    item.usage_count += 1
    session.add(item)
    session.commit()
    session.refresh(item)
    
    return {
        "success": True,
        "data": get_item_response(item)
    }


@router.delete("/{item_id}", response_model=dict)
def delete_item(
    item_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Supprime (désactive) un article"""
    item = session.get(PriceLibraryItem, item_id)
    if not item or item.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    
    item.is_active = False
    session.add(item)
    session.commit()
    
    return {"success": True, "message": "Article supprimé"}
