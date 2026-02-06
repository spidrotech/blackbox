from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from datetime import timedelta
from pydantic import BaseModel

from app.db.session import get_session
from app.models import User, UserCreate, UserRead, Token, Company, LoginRequest, UserMeResponse
from app.core.security import (
    get_password_hash,
    authenticate_user,
    create_access_token,
    get_current_user_required,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

router = APIRouter()


@router.post("/register", response_model=dict)
def register(user_data: UserCreate, session: Session = Depends(get_session)):
    """Inscription d'un nouvel utilisateur"""
    # Validation basique
    if not user_data.email or not user_data.email.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'email est requis"
        )
    
    if not user_data.password or not user_data.password.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe est requis"
        )
    
    # Vérifier si l'email existe déjà
    existing = session.exec(select(User).where(User.email == user_data.email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte avec cet email existe déjà"
        )
    
    try:
        # Créer l'utilisateur
        user = User(
            email=user_data.email,
            password=get_password_hash(user_data.password),
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone=user_data.phone,
            roles=["ROLE_USER", "ROLE_OWNER"],
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        
        # Créer une entreprise par défaut
        company = Company(
            name=f"Entreprise de {user.full_name}",
            owner_id=user.id,
        )
        session.add(company)
        session.commit()
        session.refresh(company)
        
        # Associer l'utilisateur à l'entreprise
        user.company_id = company.id
        session.add(user)
        session.commit()
        session.refresh(user)
        
        # Générer le token
        access_token = create_access_token(
            data={"sub": user.id},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return {
            "success": True,
            "token": access_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "firstName": user.first_name,
                "lastName": user.last_name,
                "roles": user.roles,
                "companyId": user.company_id,
            }
        }
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'inscription: {str(e)}"
        )


@router.post("/login", response_model=dict)
def login(credentials: LoginRequest, session: Session = Depends(get_session)):
    """Connexion utilisateur
    
    Paramètres:
    - email: L'adresse email de l'utilisateur
    - password: Le mot de passe de l'utilisateur
    
    Retourne un token JWT et les informations de l'utilisateur
    """
    try:
        # Valider les données
        if not credentials.email or not credentials.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email et mot de passe requis",
            )
        
        # Authentifier l'utilisateur
        user = authenticate_user(session, credentials.email, credentials.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou mot de passe incorrect",
            )
        
        # Générer le token
        access_token = create_access_token(
            data={"sub": user.id},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return {
            "success": True,
            "token": access_token,
            "access_token": access_token,  # Compatibilité
            "user": {
                "id": user.id,
                "email": user.email,
                "firstName": user.first_name,
                "lastName": user.last_name,
                "roles": user.roles,
                "companyId": user.company_id,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur de connexion: {str(e)}",
        )


@router.get("/me", response_model=dict)
def get_me(current_user: User = Depends(get_current_user_required)):
    """Récupère le profil de l'utilisateur connecté
    
    Requires: Bearer token in Authorization header
    """
    return {
        "success": True,
        "data": {
            "id": current_user.id,
            "email": current_user.email,
            "firstName": current_user.first_name,
            "lastName": current_user.last_name,
            "phone": current_user.phone,
            "roles": current_user.roles,
            "companyId": current_user.company_id,
            "isActive": current_user.is_active,
            "createdAt": current_user.created_at.isoformat(),
        }
    }


@router.put("/profile", response_model=dict)
def update_profile(
    profile_data: dict,
    current_user: User = Depends(get_current_user_required),
    session: Session = Depends(get_session)
):
    """Met à jour le profil utilisateur"""
    if "firstName" in profile_data:
        current_user.first_name = profile_data["firstName"]
    if "lastName" in profile_data:
        current_user.last_name = profile_data["lastName"]
    if "phone" in profile_data:
        current_user.phone = profile_data["phone"]
    
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    return {
        "success": True,
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "firstName": current_user.first_name,
            "lastName": current_user.last_name,
            "phone": current_user.phone,
            "roles": current_user.roles,
            "companyId": current_user.company_id,
        }
    }
