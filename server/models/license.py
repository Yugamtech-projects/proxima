"""
Licenses Database Model & DDL Definition.
Corresponds to db.licenses[chapterId] in proxima_db.json.
Features dedicated id VARCHAR(36) PRIMARY KEY unique identifier and chapter_id foreign key.
"""

from config.config import LICENSES_TABLE, CHAPTERS_TABLE


def get_licenses_table_sql() -> str:
    """Generates the DDL statement for the licenses table."""
    return f"""
CREATE TABLE IF NOT EXISTS {LICENSES_TABLE} (
    id VARCHAR(36) PRIMARY KEY,
    chapter_id VARCHAR(36) NOT NULL UNIQUE REFERENCES {CHAPTERS_TABLE}(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    plan VARCHAR(100) NOT NULL,
    price_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    valid_until TIMESTAMPTZ NOT NULL,
    last_payment_date TIMESTAMPTZ NULL,
    last_payment_id VARCHAR(100) NULL,
    last_order_id VARCHAR(100) NULL,
    invoices JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_licenses_chapter_id ON {LICENSES_TABLE}(chapter_id);
CREATE INDEX IF NOT EXISTS idx_licenses_validity ON {LICENSES_TABLE}(status, valid_until);
"""
