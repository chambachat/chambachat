"""
Dependencias de autenticación y autorización para FastAPI.

Provee:
- get_current_user: extrae y valida JWT del header Authorization
- get_current_user_optional: igual pero permite endpoints sin auth
- require_role: restrict a roles específicos
- require_company_member: valida membresía activa en una empresa
"""
import logging
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, CompanyMember

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer(auto_error=False)


def _decode_token(token: str) -> dict:
    """Decodifica y valida un JWT. Lanza HTTPException si es inválido o expirado."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado. Inicia sesión nuevamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        logger.warning("Token JWT inválido: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency obligatoria de autenticación.
    Extrae el JWT del header Authorization: Bearer <token>,
    valida y devuelve el User correspondiente.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere autenticación. Envía el header Authorization: Bearer <token>.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = _decode_token(credentials.credentials)
    user_id: Optional[int] = payload.get("user_id")
    email: Optional[str] = payload.get("email")

    if not user_id and not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: no contiene identificador de usuario.",
        )

    user = None
    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
    if not user and email:
        user = db.query(User).filter(User.email == email.strip().lower()).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado. Es posible que la cuenta haya sido eliminada.",
        )

    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta está desactivada. Contacta al administrador.",
        )

    return user


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Dependency opcional de autenticación.
    Devuelve el User si hay token válido, None si no hay token.
    Lanza error solo si el token existe pero es inválido.
    """
    if credentials is None:
        return None
    return get_current_user(credentials, db)


def require_role(*allowed_roles: str):
    """
    Factory de dependency que restringe acceso a usuarios con roles específicos o dominio chambachat.com
    """
    def _checker(current_user: User = Depends(get_current_user)) -> User:
        is_chambachat = current_user.email and current_user.email.endswith("@chambachat.com")
        if not is_chambachat and current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Se requiere cuenta @chambachat.com o rol: {', '.join(allowed_roles)}. "
                       f"Tu rol actual es: {current_user.role}.",
            )
        return current_user
    return _checker


def require_company_member(
    company_id: int,
    current_user: User,
    db: Session,
    required_roles: Optional[list[str]] = None,
) -> CompanyMember:
    """
    Valida que el usuario sea miembro activo de la empresa especificada.

    Args:
        company_id: ID de la empresa
        current_user: Usuario autenticado
        db: Sesión de base de datos
        required_roles: Lista de roles permitidos en la empresa (ej: ["admin"])

    Returns:
        CompanyMember del usuario en esa empresa

    Raises:
        HTTPException 403 si no es miembro o no tiene el rol requerido
    """
    member = db.query(CompanyMember).filter(
        CompanyMember.company_id == company_id,
        CompanyMember.email == current_user.email,
        CompanyMember.status == "active",
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a esta empresa. Verifica tu membresía.",
        )

    if required_roles and member.role not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Se requiere rol de empresa: {', '.join(required_roles)}. "
                   f"Tu rol en esta empresa es: {member.role}.",
        )

    return member
