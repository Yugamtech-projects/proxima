"""
Chapters Database Model & DDL Definition.
Corresponds to db.chapters in proxima_db.json with spatial center_coordinates and default_zoom support.
"""

from config.config import CHAPTERS_TABLE


def get_chapters_table_sql() -> str:
    """Generates the DDL statement for the chapters table."""
    return f"""
CREATE TABLE IF NOT EXISTS {CHAPTERS_TABLE} (
    id VARCHAR(36) PRIMARY KEY,
    slug VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    organization_type VARCHAR(50) NOT NULL DEFAULT 'Business Forum',
    city VARCHAR(100) NOT NULL,
    access_key VARCHAR(27) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    center_coordinates GEOMETRY(Point, 4326) NULL,
    default_zoom SMALLINT NOT NULL DEFAULT 12,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chapters_slug ON {CHAPTERS_TABLE}(slug);
CREATE INDEX IF NOT EXISTS idx_chapters_access_key ON {CHAPTERS_TABLE}(access_key);
CREATE INDEX IF NOT EXISTS spx_chapters_center ON {CHAPTERS_TABLE} USING GIST(center_coordinates);
"""
