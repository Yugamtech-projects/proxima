"""
VIP Passes Database Model & DDL Definition.
Corresponds to pre-generated voucher pass tokens in PostgreSQL.
"""

from config.config import VIP_PASSES_TABLE


def get_vip_passes_table_sql() -> str:
    """Generates the DDL statement for the vip_passes table."""
    return f"""
CREATE TABLE IF NOT EXISTS {VIP_PASSES_TABLE} (
    id VARCHAR(64) PRIMARY KEY,
    token VARCHAR(100) UNIQUE NOT NULL,
    label VARCHAR(255) NOT NULL,
    max_uses INT NOT NULL DEFAULT 2,
    used_count INT NOT NULL DEFAULT 0,
    plan_days INT NOT NULL DEFAULT 365,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE {VIP_PASSES_TABLE} ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_vip_passes_token ON {VIP_PASSES_TABLE}(token);
CREATE INDEX IF NOT EXISTS idx_vip_passes_status ON {VIP_PASSES_TABLE}(status);
"""
