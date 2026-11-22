"""
Users Database Model & DDL Definition.
Corresponds to db.masterAdmin and db.chapterAdmins in proxima_db.json.
Unifies Master Super Admin and Chapter Admins into a single users table.
"""

from config.config import USERS_TABLE, CHAPTERS_TABLE


def get_users_table_sql() -> str:
    """Generates the DDL statement for the users table."""
    return f"""
CREATE TABLE IF NOT EXISTS {USERS_TABLE} (
    id VARCHAR(36) PRIMARY KEY,
    chapter_id VARCHAR(36) NULL REFERENCES {CHAPTERS_TABLE}(id) ON DELETE CASCADE,
    chapter_slug VARCHAR(80) NULL,
    chapter_name VARCHAR(150) NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('MASTER_ADMIN', 'CHAPTER_ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_chapter_id ON {USERS_TABLE}(chapter_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON {USERS_TABLE}(email);
"""
