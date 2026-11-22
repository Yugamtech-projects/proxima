"""
Models package for Proxima.
Exports ALL_TABLES_SQL and table constants for schema initialization and database queries.
"""

from typing import List
from config.config import (
    CHAPTERS_TABLE,
    USERS_TABLE,
    MEMBERS_TABLE,
    LICENSES_TABLE,
)
from .chapter import get_chapters_table_sql
from .user import get_users_table_sql
from .member import get_members_table_sql
from .license import get_licenses_table_sql


def get_all_tables_sql() -> List[str]:
    """Returns all DDL table creation statements."""
    return [
        get_chapters_table_sql(),
        get_users_table_sql(),
        get_members_table_sql(),
        get_licenses_table_sql(),
    ]


ALL_TABLES_SQL = get_all_tables_sql()

__all__ = [
    "CHAPTERS_TABLE",
    "USERS_TABLE",
    "MEMBERS_TABLE",
    "LICENSES_TABLE",
    "ALL_TABLES_SQL",
    "get_all_tables_sql",
    "get_chapters_table_sql",
    "get_users_table_sql",
    "get_members_table_sql",
    "get_licenses_table_sql",
]
