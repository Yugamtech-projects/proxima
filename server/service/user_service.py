"""
User Administration Service for Proxima.
Provides complete CRUD capabilities (get_users, create_user, update_user, delete_user).
"""

from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

from auth.password import get_password_hash
from database.database import DatabaseManager
from config.config import USERS_TABLE
from schemas.user import UserCreateRequest, UserUpdateRequest
from utils.crypto import generate_secure_token
from utils.logger import logger


class UserService:
    """Class-based service managing administrative user accounts."""


    @staticmethod
    async def get_users(
        user_id: Optional[str] = None,
        email: Optional[str] = None,
        chapter_id: Optional[str] = None,
        role: Optional[str] = None,
        search: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Unified filtered user retrieval.
        A single query template handles all combinations of filters without redundant queries.
        """
        where_clauses: List[str] = []
        select_users_params: Dict[str, Any] = {}

        if user_id:
            where_clauses.append("id = :user_id")
            select_users_params["user_id"] = user_id.strip()

        if email:
            where_clauses.append("LOWER(email) = LOWER(:email)")
            select_users_params["email"] = email.strip()

        if chapter_id:
            where_clauses.append("chapter_id = :chapter_id")
            select_users_params["chapter_id"] = chapter_id.strip()

        if role:
            where_clauses.append("role = :role")
            select_users_params["role"] = role.strip().upper()

        if search:
            where_clauses.append("(LOWER(name) LIKE :search OR LOWER(email) LIKE :search)")
            select_users_params["search"] = f"%{search.strip().lower()}%"

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        pagination_sql = f"LIMIT {limit}" if limit else ""
        if offset:
            pagination_sql += f" OFFSET {offset}"

        select_users_query = f"""
            SELECT id, chapter_id, chapter_slug, chapter_name, email, name, role, is_active, created_at, updated_at
            FROM {USERS_TABLE}
            {where_sql}
            ORDER BY name ASC
            {pagination_sql}
        """
        return await DatabaseManager.execute_db_select(query=select_users_query, params=select_users_params)


    @classmethod
    async def create_user(cls, payload: UserCreateRequest) -> Dict[str, Any]:
        """Creates a new administrative user."""
        existing = await cls.get_users(email=payload.email)
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered.")

        user_id = f"user-{generate_secure_token(nbytes=4)}"
        password_hash = get_password_hash(password=payload.password.strip())

        insert_user_query = f"""
            INSERT INTO {USERS_TABLE} (id, chapter_id, chapter_slug, chapter_name, email, name, password_hash, role, is_active)
            VALUES (:id, :chapter_id, :chapter_slug, :chapter_name, :email, :name, :password_hash, :role, true)
            RETURNING id, chapter_id, chapter_slug, chapter_name, email, name, role, is_active, created_at, updated_at
        """
        insert_user_params = {
            "id": user_id,
            "chapter_id": payload.chapter_id,
            "chapter_slug": payload.chapter_slug,
            "chapter_name": payload.chapter_name,
            "email": payload.email.strip().lower(),
            "name": payload.name.strip(),
            "password_hash": password_hash,
            "role": payload.role.strip().upper(),
        }

        results = await DatabaseManager.execute_db_insert(query=insert_user_query, params=insert_user_params)
        logger.info("Created user | id=%s, email=%s, role=%s", user_id, payload.email, payload.role)
        return results[0] if results else insert_user_params


    @classmethod
    async def update_user(cls, user_id: str, payload: UserUpdateRequest) -> Optional[Dict[str, Any]]:
        """Applies dynamic partial updates to an administrative user."""
        update_clauses: List[str] = []
        update_user_params: Dict[str, Any] = {"id": user_id.strip()}

        if payload.name is not None:
            update_clauses.append("name = :name")
            update_user_params["name"] = payload.name.strip()

        if payload.email is not None:
            update_clauses.append("email = :email")
            update_user_params["email"] = payload.email.strip().lower()

        if payload.password is not None and payload.password.strip():
            update_clauses.append("password_hash = :password_hash")
            update_user_params["password_hash"] = get_password_hash(password=payload.password.strip())
            update_clauses.append("token_version = token_version + 1")

        if payload.role is not None:
            update_clauses.append("role = :role")
            update_user_params["role"] = payload.role.strip().upper()

        if payload.is_active is not None:
            update_clauses.append("is_active = :is_active")
            update_user_params["is_active"] = bool(payload.is_active)
            if not payload.is_active:
                update_clauses.append("token_version = token_version + 1")

        if not update_clauses:
            existing = await cls.get_users(user_id=user_id)
            return existing[0] if existing else None

        update_clauses.append("updated_at = CURRENT_TIMESTAMP")

        update_user_query = f"""
            UPDATE {USERS_TABLE}
            SET {", ".join(update_clauses)}
            WHERE id = :id OR LOWER(email) = LOWER(:id)
            RETURNING id, chapter_id, chapter_slug, chapter_name, email, name, role, is_active, token_version, created_at, updated_at
        """
        results = await DatabaseManager.execute_db_update(query=update_user_query, params=update_user_params)
        logger.info("Updated user | id=%s, clauses=%d", user_id, len(update_clauses))
        return results[0] if results else None


    @classmethod
    async def revoke_user_tokens(cls, user_id: str) -> bool:
        """Revokes all active JWT tokens for a user by incrementing their token_version in PostgreSQL."""
        revoke_query = f"""
            UPDATE {USERS_TABLE}
            SET token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = :id OR LOWER(email) = LOWER(:id)
        """
        revoke_params = {"id": user_id.strip()}
        await DatabaseManager.execute_db_update(query=revoke_query, params=revoke_params)
        logger.info("Revoked all active tokens for user | user_id=%s", user_id)
        return True


    @classmethod
    async def delete_user(cls, user_id: str) -> bool:
        """Deletes an administrative user."""
        delete_user_query = f"""
            DELETE FROM {USERS_TABLE}
            WHERE id = :id
        """
        delete_user_params = {"id": user_id}
        await DatabaseManager.execute_db_delete(query=delete_user_query, params=delete_user_params)
        logger.info("Deleted user | id=%s", user_id)
        return True
