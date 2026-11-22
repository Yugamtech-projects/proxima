"""
User Administration Service for Proxima.
"""

from typing import Any, Dict, List, Optional
from database.database import DatabaseManager
from config.config import USERS_TABLE


class UserService:
    """Class-based service managing administrative user accounts."""


    @staticmethod
    async def get_all_users() -> List[Dict[str, Any]]:
        """Retrieves all administrative users."""
        select_all_users_query = f"""
            SELECT * FROM {USERS_TABLE}
            ORDER BY name ASC
        """
        return await DatabaseManager.execute_db_select(query=select_all_users_query)


    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single user by primary key ID."""
        select_user_by_id_query = f"""
            SELECT * FROM {USERS_TABLE}
            WHERE id = :id
            LIMIT 1
        """
        select_user_by_id_params = {"id": user_id}
        users = await DatabaseManager.execute_db_select(query=select_user_by_id_query, params=select_user_by_id_params)
        return users[0] if users else None
