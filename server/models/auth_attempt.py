"""
PostgreSQL Table Schema for Authentication Attempt Logs.
Provides persistent, cluster-wide rate limiting, lockout defense, and security audit trails.
"""

from config.config import AUTH_ATTEMPT_LOGS_TABLE


def get_auth_attempts_table_sql() -> str:
    """Returns DDL SQL query for creating the auth_attempt_logs table and performance indexes."""
    return f"""
CREATE TABLE IF NOT EXISTS {AUTH_ATTEMPT_LOGS_TABLE} (
    id VARCHAR(36) PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    identifier VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL,
    user_agent TEXT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_identifier_time ON {AUTH_ATTEMPT_LOGS_TABLE}(identifier, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip_time ON {AUTH_ATTEMPT_LOGS_TABLE}(ip_address, attempted_at DESC);
"""
