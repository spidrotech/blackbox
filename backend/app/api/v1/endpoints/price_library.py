from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from app.db.session import get_session
from app.models import (
    PriceLibraryItem, PriceLibraryItemCreate, PriceLibraryItemUpdate,
    PriceLibraryImportRequest,
    User
)
from app.models.enums import LineItemType
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


@router.post("/import", response_model=dict)
def import_items(
    payload: PriceLibraryImportRequest,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session),
):
    """Importe une liste d'articles (migration Obat/CSV/JSON)."""
    created_count = 0
    updated_count = 0
    skipped_count = 0

    for raw_item in payload.items:
        name = (raw_item.name or "").strip()
        if not name:
            skipped_count += 1
            continue

        unit = raw_item.unit or "u"
        item_type = raw_item.item_type or LineItemType.SUPPLY
        reference = (raw_item.reference or "").strip() or None

        existing_item = None
        if payload.upsert:
            by_ref_stmt = None
            if reference:
                by_ref_stmt = select(PriceLibraryItem).where(
                    PriceLibraryItem.company_id == current_user.company_id,
                    PriceLibraryItem.reference == reference,
                )
                existing_item = session.exec(by_ref_stmt).first()

            if not existing_item:
                by_name_stmt = select(PriceLibraryItem).where(
                    PriceLibraryItem.company_id == current_user.company_id,
                    PriceLibraryItem.name == name,
                    PriceLibraryItem.unit == unit,
                    PriceLibraryItem.item_type == item_type,
                )
                existing_item = session.exec(by_name_stmt).first()

        if existing_item:
            existing_item.description = raw_item.description or existing_item.description
            existing_item.long_description = raw_item.long_description or existing_item.long_description
            existing_item.item_type = item_type
            existing_item.category = raw_item.category or existing_item.category
            existing_item.subcategory = raw_item.subcategory or existing_item.subcategory
            existing_item.trade = raw_item.trade or existing_item.trade
            existing_item.unit = unit
            existing_item.unit_price = raw_item.unit_price
            existing_item.tax_rate = raw_item.tax_rate or existing_item.tax_rate
            existing_item.reference = reference or existing_item.reference
            existing_item.brand = raw_item.brand or existing_item.brand
            existing_item.cost_price = raw_item.cost_price or existing_item.cost_price
            existing_item.is_active = True
            existing_item.updated_at = datetime.utcnow()
            session.add(existing_item)
            updated_count += 1
            continue

        new_item = PriceLibraryItem(
            company_id=current_user.company_id,
            name=name,
            description=raw_item.description,
            long_description=raw_item.long_description,
            item_type=item_type,
            category=raw_item.category,
            subcategory=raw_item.subcategory,
            trade=raw_item.trade,
            unit=unit,
            unit_price=raw_item.unit_price,
            tax_rate=raw_item.tax_rate or Decimal("20.00"),
            reference=reference,
            brand=raw_item.brand,
            cost_price=raw_item.cost_price,
            is_active=True,
        )
        session.add(new_item)
        created_count += 1

    session.commit()

    return {
        "success": True,
        "message": "Import bibliothèque terminé",
        "data": {
            "created": created_count,
            "updated": updated_count,
            "skipped": skipped_count,
            "total": len(payload.items),
        },
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


# ─── Seed: 25 articles courants du bâtiment ─────────────────────────

SEED_ITEMS = [
    # Plomberie
    {"name": "Fourniture et pose robinet mitigeur", "description": "Robinet mitigeur chrome cuisine ou salle de bain", "trade": "Plomberie", "category": "Fourniture", "unit": "u", "unit_price": "185.00", "item_type": "supply"},
    {"name": "Remplacement chauffe-eau 200L", "description": "Dépose ancien + fourniture et pose chauffe-eau électrique 200L", "trade": "Plomberie", "category": "Travaux", "unit": "u", "unit_price": "890.00", "item_type": "work"},
    {"name": "Création point d'eau", "description": "Tirage alimentation eau chaude/froide + évacuation PVC", "trade": "Plomberie", "category": "Travaux", "unit": "u", "unit_price": "450.00", "item_type": "work"},
    # Électricité
    {"name": "Pose prise électrique 16A", "description": "Fourniture et pose prise de courant 16A encastrée + câblage", "trade": "Électricité", "category": "Fourniture", "unit": "u", "unit_price": "95.00", "item_type": "work"},
    {"name": "Tableau électrique 2 rangées", "description": "Fourniture et pose tableau pré-équipé 2 rangées, mise aux normes NF C 15-100", "trade": "Électricité", "category": "Travaux", "unit": "u", "unit_price": "1250.00", "item_type": "work"},
    {"name": "Pose interrupteur va-et-vient", "description": "Fourniture et pose interrupteur va-et-vient encastré", "trade": "Électricité", "category": "Fourniture", "unit": "u", "unit_price": "75.00", "item_type": "work"},
    # Maçonnerie
    {"name": "Ouverture mur porteur", "description": "Ouverture dans mur porteur avec pose IPN, reprise enduit", "trade": "Maçonnerie", "category": "Travaux", "unit": "ml", "unit_price": "850.00", "item_type": "work"},
    {"name": "Montage cloison briques", "description": "Montage cloison en briques plâtrières 5cm, enduit 2 faces", "trade": "Maçonnerie", "category": "Travaux", "unit": "m²", "unit_price": "65.00", "item_type": "work"},
    {"name": "Coulage dalle béton", "description": "Coulage dalle béton armé épaisseur 12cm, treillis soudé", "trade": "Maçonnerie", "category": "Travaux", "unit": "m²", "unit_price": "95.00", "item_type": "work"},
    # Peinture
    {"name": "Peinture murs et plafonds", "description": "Préparation + 2 couches peinture acrylique mat/satin", "trade": "Peinture", "category": "Travaux", "unit": "m²", "unit_price": "28.00", "item_type": "labor"},
    {"name": "Enduit de lissage", "description": "Application enduit de lissage sur murs et plafonds, ponçage", "trade": "Peinture", "category": "Travaux", "unit": "m²", "unit_price": "18.00", "item_type": "labor"},
    # Menuiserie
    {"name": "Pose porte intérieure", "description": "Fourniture et pose bloc-porte isoplane bois 83cm", "trade": "Menuiserie", "category": "Fourniture", "unit": "u", "unit_price": "380.00", "item_type": "work"},
    {"name": "Pose fenêtre PVC double vitrage", "description": "Dépose ancienne + fourniture et pose fenêtre PVC 2 vantaux DV, finitions", "trade": "Menuiserie", "category": "Travaux", "unit": "u", "unit_price": "650.00", "item_type": "work"},
    # Carrelage
    {"name": "Pose carrelage sol intérieur", "description": "Fourniture et pose carrelage grès cérame 60×60, colle + joints", "trade": "Carrelage", "category": "Travaux", "unit": "m²", "unit_price": "75.00", "item_type": "work"},
    {"name": "Pose faïence murale", "description": "Fourniture et pose faïence murale 30×60, joint fin", "trade": "Carrelage", "category": "Travaux", "unit": "m²", "unit_price": "68.00", "item_type": "work"},
    # Isolation
    {"name": "Isolation combles laine soufflée", "description": "Isolation combles perdus par soufflage laine minérale R=7", "trade": "Isolation", "category": "Travaux", "unit": "m²", "unit_price": "32.00", "item_type": "work"},
    {"name": "Doublage isolant murs", "description": "Pose doublage plaque de plâtre + isolant polystyrène 10+80", "trade": "Isolation", "category": "Travaux", "unit": "m²", "unit_price": "48.00", "item_type": "work"},
    # Plâtrerie
    {"name": "Faux plafond BA13 sur ossature", "description": "Plafond suspendu plaque BA13 sur ossature métallique, bandes + enduit", "trade": "Plâtrerie", "category": "Travaux", "unit": "m²", "unit_price": "52.00", "item_type": "work"},
    {"name": "Cloison placo BA13", "description": "Cloison plaque de plâtre BA13 sur ossature 48mm, bandes + enduit 2 faces", "trade": "Plâtrerie", "category": "Travaux", "unit": "m²", "unit_price": "55.00", "item_type": "work"},
    # Toiture
    {"name": "Réfection couverture tuiles", "description": "Dépose + fourniture et pose tuiles terre cuite, liteaux, sous-toiture", "trade": "Toiture", "category": "Travaux", "unit": "m²", "unit_price": "120.00", "item_type": "work"},
    {"name": "Zinguerie gouttière", "description": "Fourniture et pose gouttière aluminium laqué + descente", "trade": "Toiture", "category": "Fourniture", "unit": "ml", "unit_price": "45.00", "item_type": "supply"},
    # Chauffage / CVC
    {"name": "Pose radiateur électrique", "description": "Fourniture et pose radiateur à inertie 1500W, raccordement", "trade": "Chauffage", "category": "Fourniture", "unit": "u", "unit_price": "480.00", "item_type": "work"},
    {"name": "Installation climatisation split", "description": "Fourniture et pose unité intérieure + extérieure mono-split, mise en service", "trade": "Chauffage", "category": "Travaux", "unit": "u", "unit_price": "2200.00", "item_type": "work"},
    # Revêtement de sol
    {"name": "Pose parquet flottant", "description": "Fourniture et pose parquet stratifié aspect chêne, sous-couche incluse", "trade": "Revêtement de sol", "category": "Travaux", "unit": "m²", "unit_price": "42.00", "item_type": "work"},
    # Démolition
    {"name": "Démolition cloison", "description": "Démolition cloison légère, évacuation gravats", "trade": "Démolition", "category": "Travaux", "unit": "m²", "unit_price": "22.00", "item_type": "labor"},
    # Main d'œuvre
    {"name": "Main d'œuvre qualifiée BTP", "description": "Heure de main d'œuvre ouvrier qualifié tous corps d'état", "trade": "Main d'œuvre", "category": "Main d'œuvre", "unit": "h", "unit_price": "45.00", "item_type": "labor"},
]


@router.post("/seed", response_model=dict)
def seed_library(
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session),
):
    """Insère les articles standards du bâtiment dans la bibliothèque de prix"""
    from app.models.enums import LineItemType

    created = 0
    for item_data in SEED_ITEMS:
        # Skip si un article avec le même nom existe déjà
        existing = session.exec(
            select(PriceLibraryItem).where(
                PriceLibraryItem.company_id == current_user.company_id,
                PriceLibraryItem.name == item_data["name"],
            )
        ).first()
        if existing:
            continue

        item = PriceLibraryItem(
            company_id=current_user.company_id,
            name=item_data["name"],
            description=item_data["description"],
            trade=item_data.get("trade"),
            category=item_data.get("category"),
            unit=item_data.get("unit", "u"),
            unit_price=Decimal(item_data["unit_price"]),
            tax_rate=Decimal("20.00"),
            item_type=LineItemType(item_data.get("item_type", "supply")),
        )
        session.add(item)
        created += 1

    session.commit()

    return {
        "success": True,
        "message": f"{created} articles ajoutés à la bibliothèque",
        "data": {"created": created, "total_seed": len(SEED_ITEMS)},
    }
