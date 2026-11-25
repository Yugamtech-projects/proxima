"""
FastAPI Security Dependencies for Proxima.
Provides token extraction, user validation, and role-based access control guards.
"""

from typing import Any, Dict, Optional
from fastapi import Depends, Header, HTTPException, status

from auth.jwt import decode_access_token
from database.database import DatabaseManager
from config.config import USERS_TABLE


async def get_current_user(authorization: Optional[str] = Header(default=None, alias="Authorization")) -> Dict[str, Any]:
    """Validates Bearer token from Authorization header and returns user or raises HTTP 401."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required. Please provide a valid Bearer token.", headers={"WWW-Authenticate": "Bearer"})

    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication token is missing.", headers={"WWW-Authenticate": "Bearer"})

    payload = decode_access_token(token=token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.", headers={"WWW-Authenticate": "Bearer"})

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject identity.", headers={"WWW-Authenticate": "Bearer"})

    select_user_by_email_query = f"""
        SELECT * FROM {USERS_TABLE}
        WHERE email = :email
        LIMIT 1
    """
    select_user_by_email_params = {"email": email}
    users = await DatabaseManager.execute_db_select(query=select_user_by_email_query, params=select_user_by_email_params)
    if not users:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found.", headers={"WWW-Authenticate": "Bearer"})

    user = users[0]

    # Verify user account is active
    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is deactivated or suspended.", headers={"WWW-Authenticate": "Bearer"})

    # Verify JWT token version matches the database token_version (instant revocation check)
    raw_token_version = payload.get("ver")
    raw_expected_version = user.get("token_version")

    if raw_token_version is not None:
        try:
            token_version = int(raw_token_version)
            expected_version = int(raw_expected_version) if raw_expected_version is not None else 1
            if token_version != expected_version:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session token has been revoked. Please log in again.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session token has been revoked. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    return user


async def require_master_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Ensures the authenticated user has MASTER_ADMIN privileges."""
    if current_user.get("role") != "MASTER_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Master Admin privileges required.")
    return current_user


async def require_chapter_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Ensures the authenticated user has CHAPTER_ADMIN or MASTER_ADMIN privileges."""
    if current_user.get("role") not in ("CHAPTER_ADMIN", "MASTER_ADMIN"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Admin privileges required.")
    return current_user
