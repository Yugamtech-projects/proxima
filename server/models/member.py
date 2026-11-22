"""
Members Database Model & DDL Definition.
Corresponds strictly to db.members[chapterId] records in proxima_db.json.
"""

from config.config import MEMBERS_TABLE, CHAPTERS_TABLE


def get_members_table_sql() -> str:
    """Generates the DDL statement for the members table."""
    return f"""
CREATE TABLE IF NOT EXISTS {MEMBERS_TABLE} (
    id VARCHAR(36) PRIMARY KEY,
    chapter_id VARCHAR(36) NOT NULL REFERENCES {CHAPTERS_TABLE}(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    company VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    category_id VARCHAR(50) NOT NULL,
    category_icon VARCHAR(50) NOT NULL DEFAULT 'Briefcase',
    short_bio VARCHAR(500) NULL,
    phone VARCHAR(30) NOT NULL,
    whatsapp VARCHAR(30) NULL,
    email VARCHAR(150) NOT NULL,
    website VARCHAR(255) NULL,
    photo_url VARCHAR(512) NULL,
    location JSONB NOT NULL DEFAULT '{{}}'::jsonb,
    one_to_one_availability VARCHAR(25) NOT NULL DEFAULT 'AVAILABLE',
    referral_requirements TEXT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    membership_status VARCHAR(20) NOT NULL DEFAULT 'RENEWED',
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_members_chapter_visibility ON {MEMBERS_TABLE}(chapter_id, is_visible);
CREATE INDEX IF NOT EXISTS idx_members_category_id ON {MEMBERS_TABLE}(category_id);
"""
