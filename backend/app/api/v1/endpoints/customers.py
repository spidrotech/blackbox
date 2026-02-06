from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional

from app.db.session import get_session
from app.models import (
    Customer, CustomerCreate, CustomerRead, CustomerUpdate,
    Address, User
)
from app.core.security import get_current_user_required

router = APIRouter()


def get_customer_response(customer: Customer, session: Session) -> dict:
    """Formatte la réponse client avec l'adresse"""
    address = None
    if customer.address_id:
        addr = session.get(Address, customer.address_id)
        if addr:
            address = {
                "street": addr.street,
                "city": addr.city,
                "postalCode": addr.postal_code,
                "country": addr.country,
            }
    
    # Splitter le nom en first_name et last_name pour le frontend
    name_parts = customer.name.split(' ', 1) if customer.name else ['', '']
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ''
    
    return {
        "id": customer.id,
        "companyId": customer.company_id,
        "type": customer.type.value,
        "name": customer.name,
        "firstName": first_name,
        "lastName": last_name,
        "contactName": customer.contact_name,
        "email": customer.email,
        "phone": customer.phone,
        "mobile": customer.mobile,
        "website": customer.website,
        "siret": customer.siret,
        "vat": customer.vat,
        "notes": customer.notes,
        "isActive": customer.is_active,
        "createdAt": customer.created_at.isoformat(),
        "address": address,
    }


@router.get("/", response_model=dict)
def list_customers(
    search: Optional[str] = None,
    type: Optional[str] = None,
    is_active: bool = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Liste tous les clients de l'entreprise"""
    statement = select(Customer).where(Customer.company_id == current_user.company_id)
    
    if is_active is not None:
        statement = statement.where(Customer.is_active == is_active)
    
    if type:
        statement = statement.where(Customer.type == type)
    
    if search:
        from sqlalchemy import or_, func
        statement = statement.where(
            or_(
                func.lower(Customer.name).contains(search.lower()),
                func.lower(Customer.email).contains(search.lower())
            )
        )
    
    statement = statement.offset(skip).limit(limit)
    customers = session.exec(statement).all()
    
    return {
        "success": True,
        "data": [get_customer_response(c, session) for c in customers],
        "meta": {"total": len(customers)}
    }


@router.get("/{customer_id}", response_model=dict)
def get_customer(
    customer_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Récupère un client par son ID"""
    customer = session.get(Customer, customer_id)
    if not customer or customer.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    return {
        "success": True,
        "data": get_customer_response(customer, session)
    }


@router.post("/", response_model=dict)
def create_customer(
    customer_data: CustomerCreate,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Crée un nouveau client"""
    try:
        # Générer le nom si nécessaire
        name = customer_data.get_name()
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    
    # Créer l'adresse si fournie
    address_id = None
    if customer_data.address:
        addr = customer_data.address
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
    
    customer = Customer(
        company_id=current_user.company_id,
        type=customer_data.type,
        name=name,
        contact_name=customer_data.contact_name,
        email=customer_data.email,
        phone=customer_data.phone,
        mobile=customer_data.mobile,
        website=customer_data.website,
        siret=customer_data.siret,
        vat=customer_data.vat,
        notes=customer_data.notes,
        address_id=address_id,
    )
    session.add(customer)
    session.commit()
    session.refresh(customer)
    
    return {
        "success": True,
        "data": get_customer_response(customer, session)
    }


@router.put("/{customer_id}", response_model=dict)
def update_customer(
    customer_id: int,
    customer_data: CustomerUpdate,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Met à jour un client"""
    customer = session.get(Customer, customer_id)
    if not customer or customer.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    update_data = customer_data.model_dump(exclude_unset=True)
    
    # Gérer l'adresse séparément
    if "address" in update_data:
        addr_data = update_data.pop("address")
        if addr_data:
            if customer.address_id:
                address = session.get(Address, customer.address_id)
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
                customer.address_id = address.id
    
    for key, value in update_data.items():
        setattr(customer, key, value)
    
    session.add(customer)
    session.commit()
    session.refresh(customer)
    
    return {
        "success": True,
        "data": get_customer_response(customer, session)
    }


@router.delete("/{customer_id}", response_model=dict)
def delete_customer(
    customer_id: int,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Supprime (désactive) un client"""
    customer = session.get(Customer, customer_id)
    if not customer or customer.company_id != current_user.company_id:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    customer.is_active = False
    session.add(customer)
    session.commit()
    
    return {"success": True, "message": "Client supprimé"}
