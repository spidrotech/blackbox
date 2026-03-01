from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlmodel import Session
import os
import uuid

from app.db.session import get_session
from app.core.security import get_current_user_required
from app.models import Company, User

router = APIRouter()


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
