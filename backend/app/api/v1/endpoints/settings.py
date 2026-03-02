from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
import os
import uuid

from app.db.session import get_session
from app.core.security import get_current_user_required
from app.core.security import get_password_hash, verify_password
from app.models import Company, User

router = APIRouter()


ROLE_TO_BACKEND = {
    'owner': ['ROLE_USER', 'ROLE_OWNER'],
    'manager': ['ROLE_USER', 'ROLE_MANAGER'],
    'commercial': ['ROLE_USER', 'ROLE_COMMERCIAL'],
    'chef_chantier': ['ROLE_USER', 'ROLE_SITE_MANAGER'],
    'ouvrier': ['ROLE_USER', 'ROLE_WORKER'],
}


def _frontend_role_from_user(user: User, company: Company | None) -> str:
    if company and company.owner_id == user.id:
        return 'owner'
    roles = user.roles or []
    if 'ROLE_MANAGER' in roles:
        return 'manager'
    if 'ROLE_COMMERCIAL' in roles:
        return 'commercial'
    if 'ROLE_SITE_MANAGER' in roles:
        return 'chef_chantier'
    return 'ouvrier'


def _serialize_user(user: User, company: Company | None) -> dict:
    return {
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'phone': user.phone,
        'company_id': user.company_id,
        'is_active': user.is_active,
        'role': _frontend_role_from_user(user, company),
        'roles': user.roles,
    }


@router.get('/company', response_model=dict)
def get_company(current_user: User = Depends(get_current_user_required), session: Session = Depends(get_session)):
    company = session.get(Company, current_user.company_id) if getattr(current_user, 'company_id', None) else None
    if not company:
        raise HTTPException(status_code=404, detail='Company not found')
    # Simple serializable dict
    data = {
        'id': company.id,
        'name': company.name,
        'siret': company.siret,
        'address': company.address,
        'postal_code': company.postal_code,
        'city': company.city,
        'country': company.country,
        'phone': company.phone,
        'email': company.email,
        'website': company.website,
        'logo_url': company.logo_url,
        'vat_number': company.vat_number,
        'invoice_prefix': company.invoice_prefix,
        'quote_prefix': company.quote_prefix,
        'next_invoice_number': company.next_invoice_number,
        'next_quote_number': company.next_quote_number,
        'default_payment_terms': company.default_payment_terms,
        'default_conditions': company.default_conditions,
        'legal_mentions': company.legal_mentions,
        # new document settings
        'header_text': getattr(company, 'header_text', None),
        'footer_text': getattr(company, 'footer_text', None),
        'visuals_json': getattr(company, 'visuals_json', None),
        'labels_json': getattr(company, 'labels_json', None),
        'quote_defaults_json': getattr(company, 'quote_defaults_json', None),
        'invoice_defaults_json': getattr(company, 'invoice_defaults_json', None),
        'cgv_url': getattr(company, 'cgv_url', None),
        # Informations bancaires
        'iban': getattr(company, 'iban', None),
        'bic': getattr(company, 'bic', None),
        # Juridique
        'rcs_city': getattr(company, 'rcs_city', None),
        'rm_number': getattr(company, 'rm_number', None),
        'capital': getattr(company, 'capital', None),
        'ape_code': getattr(company, 'ape_code', None),
        'vat_subject': getattr(company, 'vat_subject', True),
        'vat_collection_type': getattr(company, 'vat_collection_type', None),
        # Garantie & Assurance
        'guarantee_type': getattr(company, 'guarantee_type', None),
        'insurance_name': getattr(company, 'insurance_name', None),
        'insurance_coverage': getattr(company, 'insurance_coverage', None),
        'insurance_address': getattr(company, 'insurance_address', None),
        'insurance_zipcode': getattr(company, 'insurance_zipcode', None),
        'insurance_city': getattr(company, 'insurance_city', None),
    }
    return {'success': True, 'data': data}


@router.put('/company', response_model=dict)
def update_company(payload: dict, current_user: User = Depends(get_current_user_required), session: Session = Depends(get_session)):
    company = session.get(Company, current_user.company_id) if getattr(current_user, 'company_id', None) else None
    if not company:
        raise HTTPException(status_code=404, detail='Company not found')
    # Update allowed fields
    allowed = ['name','siret','address','postal_code','city','country','phone','email','website',
               'vat_number','vat_subject','vat_collection_type',
               'rcs_city','rm_number','capital','ape_code',
               'invoice_prefix','quote_prefix','next_invoice_number','next_quote_number',
               'default_payment_terms','default_conditions','legal_mentions',
               'header_text','footer_text','visuals_json','labels_json',
               'quote_defaults_json','invoice_defaults_json',
               'iban','bic',
               'guarantee_type','insurance_name','insurance_coverage',
               'insurance_address','insurance_zipcode','insurance_city']
    for k in allowed:
        if k in payload:
            setattr(company, k, payload.get(k))
    session.add(company)
    session.commit()
    session.refresh(company)
    return {'success': True, 'data': {'id': company.id}}


@router.post('/company/logo', response_model=dict)
def upload_logo(file: UploadFile = File(...), current_user: User = Depends(get_current_user_required), session: Session = Depends(get_session)):
    company = session.get(Company, current_user.company_id) if getattr(current_user, 'company_id', None) else None
    if not company:
        raise HTTPException(status_code=404, detail='Company not found')
    uploads_dir = os.path.join(os.getcwd(), 'static', 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1] or '.png'
    filename = f"company_{company.id}_{uuid.uuid4().hex}{ext}"
    dest = os.path.join(uploads_dir, filename)
    with open(dest, 'wb') as f:
        content = file.file.read()
        f.write(content)
    # Save relative URL
    company.logo_url = f"/static/uploads/{filename}"
    session.add(company)
    session.commit()
    session.refresh(company)
    return {'success': True, 'data': {'logo_url': company.logo_url}}


@router.post('/company/cgv', response_model=dict)
def upload_cgv(file: UploadFile = File(...), current_user: User = Depends(get_current_user_required), session: Session = Depends(get_session)):
    company = session.get(Company, current_user.company_id) if getattr(current_user, 'company_id', None) else None
    if not company:
        raise HTTPException(status_code=404, detail='Company not found')
    uploads_dir = os.path.join(os.getcwd(), 'static', 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1] or '.pdf'
    filename = f"company_{company.id}_cgv_{uuid.uuid4().hex}{ext}"
    dest = os.path.join(uploads_dir, filename)
    with open(dest, 'wb') as f:
        content = file.file.read()
        f.write(content)
    company.cgv_url = f"/static/uploads/{filename}"
    session.add(company)
    session.commit()
    session.refresh(company)
    return {'success': True, 'data': {'cgv_url': company.cgv_url}}


@router.get('/team', response_model=dict)
def get_team(current_user: User = Depends(get_current_user_required), session: Session = Depends(get_session)):
    company = session.get(Company, current_user.company_id) if getattr(current_user, 'company_id', None) else None
    if not company:
        raise HTTPException(status_code=404, detail='Company not found')

    members = session.exec(
        select(User).where(User.company_id == company.id).order_by(User.created_at.asc())
    ).all()
    return {'success': True, 'data': [_serialize_user(member, company) for member in members]}


@router.post('/team', response_model=dict)
def create_team_member(payload: dict, current_user: User = Depends(get_current_user_required), session: Session = Depends(get_session)):
    company = session.get(Company, current_user.company_id) if getattr(current_user, 'company_id', None) else None
    if not company:
        raise HTTPException(status_code=404, detail='Company not found')

    email = (payload.get('email') or '').strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail='Email requis')

    existing = session.exec(select(User).where(User.email == email)).first()
    if existing:
        raise HTTPException(status_code=400, detail='Un utilisateur avec cet email existe déjà')

    role = payload.get('role') or 'ouvrier'
    if role not in ROLE_TO_BACKEND:
        role = 'ouvrier'

    provided_password = (payload.get('password') or '').strip()
    temp_password = provided_password or uuid.uuid4().hex[:12]

    user = User(
        email=email,
        password=get_password_hash(temp_password),
        first_name=(payload.get('first_name') or None),
        last_name=(payload.get('last_name') or None),
        phone=(payload.get('phone') or None),
        company_id=company.id,
        roles=ROLE_TO_BACKEND.get(role, ROLE_TO_BACKEND['ouvrier']),
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    data = _serialize_user(user, company)
    if not provided_password:
        data['temporary_password'] = temp_password

    return {'success': True, 'data': data}


@router.patch('/team/{user_id}', response_model=dict)
def update_team_member(user_id: int, payload: dict, current_user: User = Depends(get_current_user_required), session: Session = Depends(get_session)):
    company = session.get(Company, current_user.company_id) if getattr(current_user, 'company_id', None) else None
    if not company:
        raise HTTPException(status_code=404, detail='Company not found')

    user = session.get(User, user_id)
    if not user or user.company_id != company.id:
        raise HTTPException(status_code=404, detail='Utilisateur introuvable')

    if 'email' in payload:
        email = (payload.get('email') or '').strip().lower()
        if not email:
            raise HTTPException(status_code=400, detail='Email invalide')
        if email != user.email:
            existing = session.exec(select(User).where(User.email == email)).first()
            if existing and existing.id != user.id:
                raise HTTPException(status_code=400, detail='Un utilisateur avec cet email existe déjà')
            user.email = email

    if 'first_name' in payload:
        user.first_name = payload.get('first_name') or None
    if 'last_name' in payload:
        user.last_name = payload.get('last_name') or None
    if 'phone' in payload:
        user.phone = payload.get('phone') or None
    if 'is_active' in payload:
        user.is_active = bool(payload.get('is_active'))

    if 'role' in payload and user.id != company.owner_id:
        role = payload.get('role')
        if role not in ROLE_TO_BACKEND:
            raise HTTPException(status_code=400, detail='Rôle invalide')
        user.roles = ROLE_TO_BACKEND[role]

    session.add(user)
    session.commit()
    session.refresh(user)
    return {'success': True, 'data': _serialize_user(user, company)}


@router.delete('/team/{user_id}', response_model=dict)
def remove_team_member(user_id: int, current_user: User = Depends(get_current_user_required), session: Session = Depends(get_session)):
    company = session.get(Company, current_user.company_id) if getattr(current_user, 'company_id', None) else None
    if not company:
        raise HTTPException(status_code=404, detail='Company not found')

    user = session.get(User, user_id)
    if not user or user.company_id != company.id:
        raise HTTPException(status_code=404, detail='Utilisateur introuvable')
    if user.id == company.owner_id:
        raise HTTPException(status_code=400, detail='Le propriétaire ne peut pas être supprimé')

    user.is_active = False
    session.add(user)
    session.commit()
    return {'success': True, 'data': {'id': user.id, 'is_active': False}}


@router.put('/account/email', response_model=dict)
def update_login_email(payload: dict, current_user: User = Depends(get_current_user_required), session: Session = Depends(get_session)):
    current_password = (payload.get('current_password') or '').strip()
    new_email = (payload.get('email') or '').strip().lower()

    if not current_password:
        raise HTTPException(status_code=400, detail='Mot de passe actuel requis')
    if not verify_password(current_password, current_user.password):
        raise HTTPException(status_code=400, detail='Mot de passe actuel incorrect')
    if not new_email:
        raise HTTPException(status_code=400, detail='Nouvel email requis')

    existing = session.exec(select(User).where(User.email == new_email)).first()
    if existing and existing.id != current_user.id:
        raise HTTPException(status_code=400, detail='Un utilisateur avec cet email existe déjà')

    current_user.email = new_email
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return {'success': True, 'data': {'email': current_user.email}}


@router.put('/account/password', response_model=dict)
def update_password(payload: dict, current_user: User = Depends(get_current_user_required), session: Session = Depends(get_session)):
    current_password = (payload.get('current_password') or '').strip()
    new_password = (payload.get('new_password') or '').strip()

    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail='Mot de passe actuel et nouveau requis')
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail='Le nouveau mot de passe doit contenir au moins 8 caractères')
    if not verify_password(current_password, current_user.password):
        raise HTTPException(status_code=400, detail='Mot de passe actuel incorrect')

    current_user.password = get_password_hash(new_password)
    session.add(current_user)
    session.commit()
    return {'success': True, 'data': {'updated': True}}
