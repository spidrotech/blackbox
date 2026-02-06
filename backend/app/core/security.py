from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select

from app.db.session import get_session
from app.models import User, TokenData
from app.core.config import settings

# Initialize CryptContext avec fallback: argon2 puis bcrypt
try:
    pwd_context = CryptContext(
        schemes=["argon2", "bcrypt"],
        deprecated="auto",
    )
except Exception as e:
    # Si argon2 n'est pas dispo, utiliser bcrypt uniquement
    print(f"Warning: Argon2 not available ({e}), using bcrypt")
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 jours


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash using Argon2"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password using Argon2 (PBKDF2 as fallback)
    
    Argon2 est l'algorithme recommandé par OWASP pour le hachage de mots de passe.
    N'a pas la limitation des 72 bytes de bcrypt.
    """
    if not password or not password.strip():
        raise ValueError("Password cannot be empty")
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    # JWT requires "sub" to be a string
    if "sub" in to_encode and not isinstance(to_encode["sub"], str):
        to_encode["sub"] = str(to_encode["sub"])
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(
    session: Session = Depends(get_session),
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[User]:
    """Récupère l'utilisateur courant à partir du token JWT"""
    if not token:
        return None
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            return None
        # JWT uses string for "sub", convert back to int
        user_id = int(user_id_str)
        token_data = TokenData(user_id=user_id)
    except JWTError:
        return None
    except ValueError:
        return None
    
    user = session.get(User, token_data.user_id)
    if user is None or not user.is_active:
        return None
    return user


def get_current_user_required(
    current_user: Optional[User] = Depends(get_current_user)
) -> User:
    """Exige un utilisateur connecté avec un Bearer token valide"""
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token manquant ou invalide. Utilisez: Authorization: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


def authenticate_user(session: Session, email: str, password: str) -> Optional[User]:
    """Authentifie un utilisateur"""
    statement = select(User).where(User.email == email)
    user = session.exec(statement).first()
    if not user:
        return None
    if not verify_password(password, user.password):
        return None
    return user
