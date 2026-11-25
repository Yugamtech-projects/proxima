"""
Authentication Business Logic Service for Proxima.
Handles credential verification, sliding-window rate limit defense,
and JWT session token creation.
"""

import time
from typing import Any, Dict, Optional
from fastapi import HTTPException, status

from config.config import USERS_TABLE, CHAPTERS_TABLE
from database.database import DatabaseManager
from auth.password import verify_password
from auth.jwt import create_access_token
from service.audit_service import AuditService
from utils.logger import logger


class AuthService:
    """Class-based authentication service handling login, lockout and sessions."""


    @staticmethod
    async def _resolve_user(clean_id: str) -> Optional[Dict[str, Any]]:
        """Resolves a user by email, username, chapter_slug, or master admin aliases."""
        alt_email = f"{clean_id}@proxima.network" if "@" not in clean_id else clean_id
        select_user_query = f"""
            SELECT * FROM {USERS_TABLE}
            WHERE LOWER(email) = :clean_id
               OR LOWER(email) = :alt_email
               OR SPLIT_PART(LOWER(email), '@', 1) = :clean_id
               OR LOWER(chapter_slug) = :clean_id
               OR id = :clean_id
            LIMIT 1
        """
        select_user_params = {"clean_id": clean_id, "alt_email": alt_email}
        users = await DatabaseManager.execute_db_select(query=select_user_query, params=select_user_params)
        if users:
            return users[0]

        # Check Master Admin aliases ('admin', 'master', 'superadmin')
        if clean_id in ("admin", "master", "superadmin"):
            select_master_admin_query = f"""
                SELECT * FROM {USERS_TABLE}
                WHERE role = 'MASTER_ADMIN'
                LIMIT 1
            """
            master_users = await DatabaseManager.execute_db_select(query=select_master_admin_query)
            if master_users:
                return master_users[0]

        return None


    @classmethod
    async def authenticate_user(cls, login_id: str, password: str, client_ip: str = "127.0.0.1", user_agent: Optional[str] = None) -> Dict[str, Any]:
        """
        Authenticates credentials against stored password hashes.
        Enforces a 15-minute sliding-window rate limiter on failed attempts in PostgreSQL audit logs.
        """
        clean_id = login_id.strip().lower()

        # 1. Check Server-Side Rate Limit Lockout from PostgreSQL Audit Service
        is_locked, remaining_seconds = await AuditService.check_account_lockout(identifier=clean_id, ip_address=client_ip)
        if is_locked:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=f"Too many failed login attempts. Security lockout active for {remaining_seconds}s.")

        # 2. Lookup User
        user = await cls._resolve_user(clean_id=clean_id)
        if not user:
            await AuditService.record_login_attempt(identifier=clean_id, ip_address=client_ip, status="FAILED", user_agent=user_agent)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials. Access denied.")

        # 3. Verify Password Hash
        is_valid = verify_password(plain_password=password, hashed_password=user.get("password_hash", ""))
        if not is_valid:
            await AuditService.record_login_attempt(identifier=clean_id, ip_address=client_ip, status="FAILED", user_agent=user_agent)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials. Access denied.")

        # 4. Success: Record in audit log
        await AuditService.record_successful_login(identifier=clean_id, ip_address=client_ip, user_agent=user_agent)

        # 5. Fetch associated Chapter details for session payload
        chapter_data: Optional[Dict[str, Any]] = None
        if user.get("chapter_id"):
            select_user_chapter_query = f"""
                SELECT * FROM {CHAPTERS_TABLE}
                WHERE id = :chapter_id
                LIMIT 1
            """
            select_user_chapter_params = {"chapter_id": user["chapter_id"]}
            chapters = await DatabaseManager.execute_db_select(query=select_user_chapter_query, params=select_user_chapter_params)
            if chapters:
                chapter_record = chapters[0]
                chapter_data = {
                    "id": chapter_record.get("id"),
                    "slug": chapter_record.get("slug"),
                    "name": chapter_record.get("name"),
                    "organization_type": chapter_record.get("organization_type", "Business Forum"),
                    "city": chapter_record.get("city"),
                    "access_key": chapter_record.get("access_key"),
                    "status": chapter_record.get("status", "ACTIVE"),
                }

        # 6. Generate 24-hour stateless JWT token with token_version for instant revocation
        token_payload = {
            "sub": user["email"],
            "role": user["role"],
            "chapter_id": user.get("chapter_id"),
            "ver": int(user.get("token_version", 1)),
        }
        token = create_access_token(data=token_payload)

        # 7. Construct session object in pure snake_case
        session = {
            "token": token,
            "role": user["role"],
            "email": user["email"],
            "name": user.get("name", "Admin"),
            "chapter": chapter_data,
            "expires_at": int(time.time() * 1000) + 24 * 3600 * 1000,
        }

        logger.info("Admin login successful | email=%s, role=%s", user["email"], user["role"])
        return {"success": True, "session": session}
