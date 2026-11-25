"""
Authentication Audit & Security Tracking Service for Proxima.
Provides a persistent, cluster-wide audit ledger and 15-minute brute-force lockout defense in PostgreSQL.
"""

from datetime import datetime, timezone
from typing import Any, Optional, Tuple
from config.config import AUTH_ATTEMPT_LOGS_TABLE
from database.database import DatabaseManager
from utils.crypto import generate_secure_token
from utils.logger import logger


class AuditService:
    """Class-based audit logging and authentication attempt defense service."""

    MAX_FAILED_ATTEMPTS: int = 5
    LOCKOUT_SECONDS: int = 15 * 60  # 15 minutes


    @classmethod
    async def check_account_lockout(cls, identifier: str, ip_address: str = "127.0.0.1") -> Tuple[bool, int]:
        """
        Checks if the specified identifier or IP is currently locked out in PostgreSQL.
        Returns: (is_locked: bool, remaining_seconds: int)
        """
        clean_identifier = identifier.strip().lower()
        clean_ip = ip_address.strip()

        select_failed_attempts_query = f"""
            SELECT attempted_at FROM {AUTH_ATTEMPT_LOGS_TABLE}
            WHERE (identifier = :identifier OR ip_address = :ip_address)
              AND status = 'FAILED'
              AND attempted_at > (NOW() - INTERVAL '15 minutes')
            ORDER BY attempted_at DESC
            LIMIT :max_attempts
        """
        select_failed_attempts_params = {
            "identifier": clean_identifier,
            "ip_address": clean_ip,
            "max_attempts": cls.MAX_FAILED_ATTEMPTS,
        }
        failures = await DatabaseManager.execute_db_select(query=select_failed_attempts_query, params=select_failed_attempts_params)

        if len(failures) >= cls.MAX_FAILED_ATTEMPTS:
            latest_time = failures[0].get("attempted_at")
            if latest_time:
                if isinstance(latest_time, str):
                    try:
                        latest_time = datetime.fromisoformat(latest_time.replace("Z", "+00:00"))
                    except Exception:
                        latest_time = datetime.now(timezone.utc)
                now_dt = datetime.now(timezone.utc)
                elapsed = (now_dt - latest_time).total_seconds()
                remaining = int(cls.LOCKOUT_SECONDS - elapsed)
                if remaining > 0:
                    return True, remaining

        return False, 0


    @classmethod
    async def record_login_attempt(cls, identifier: str, ip_address: str = "127.0.0.1", status: str = "FAILED", user_agent: Optional[str] = None) -> None:
        """Records an authentication attempt in PostgreSQL audit logs."""
        log_id = f"auth_log_{generate_secure_token(nbytes=8)}"
        clean_identifier = identifier.strip().lower()
        clean_ip = ip_address.strip()
        clean_status = status.strip().upper()

        insert_attempt_log_query = f"""
            INSERT INTO {AUTH_ATTEMPT_LOGS_TABLE} (id, ip_address, identifier, status, user_agent, attempted_at)
            VALUES (:id, :ip_address, :identifier, :status, :user_agent, CURRENT_TIMESTAMP)
        """
        insert_attempt_log_params = {
            "id": log_id,
            "ip_address": clean_ip,
            "identifier": clean_identifier,
            "status": clean_status,
            "user_agent": user_agent[:500] if user_agent else None,
        }
        await DatabaseManager.execute_db_insert(query=insert_attempt_log_query, params=insert_attempt_log_params)

        if clean_status == "FAILED":
            logger.warning("Recorded failed login attempt | identifier=%s, ip=%s", clean_identifier, clean_ip)
        else:
            logger.info("Recorded successful login | identifier=%s, ip=%s", clean_identifier, clean_ip)


    @classmethod
    async def record_successful_login(cls, identifier: str, ip_address: str = "127.0.0.1", user_agent: Optional[str] = None) -> None:
        """Records a successful authentication event in the audit trail."""
        await cls.record_login_attempt(identifier=identifier, ip_address=ip_address, status="SUCCESS", user_agent=user_agent)


    @classmethod
    async def get_security_audit_logs(
        cls,
        identifier: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """Retrieves recent authentication attempt logs from PostgreSQL with optional filtering and pagination."""
        where_clauses: list[str] = []
        select_params: dict[str, Any] = {"limit": limit, "offset": offset}

        if identifier:
            where_clauses.append("LOWER(identifier) LIKE :identifier")
            select_params["identifier"] = f"%{identifier.strip().lower()}%"

        if status:
            where_clauses.append("status = :status")
            select_params["status"] = status.strip().upper()

        if start_date:
            where_clauses.append("attempted_at >= :start_date")
            select_params["start_date"] = start_date.strip()

        if end_date:
            where_clauses.append("attempted_at <= :end_date")
            select_params["end_date"] = end_date.strip()

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        select_recent_attempts_query = f"""
            SELECT id, ip_address, identifier, status, user_agent, attempted_at
            FROM {AUTH_ATTEMPT_LOGS_TABLE}
            {where_sql}
            ORDER BY attempted_at DESC
            LIMIT :limit OFFSET :offset
        """
        rows = await DatabaseManager.execute_db_select(query=select_recent_attempts_query, params=select_params)
        formatted: list[dict[str, Any]] = []
        for r in rows:
            t = r.get("attempted_at")
            formatted.append({
                "id": str(r.get("id")),
                "ip_address": str(r.get("ip_address")),
                "identifier": str(r.get("identifier")),
                "status": str(r.get("status")),
                "user_agent": r.get("user_agent"),
                "attempted_at": t.isoformat() if hasattr(t, "isoformat") else str(t),
            })
        return formatted


    @classmethod
    async def get_security_metrics_24h(cls) -> dict[str, int]:
        """Calculates security metrics over the past 24 hours."""
        select_stats_query = f"""
            SELECT
                COUNT(*) FILTER (WHERE attempted_at > (NOW() - INTERVAL '24 hours')) AS total_attempts,
                COUNT(*) FILTER (WHERE status = 'FAILED' AND attempted_at > (NOW() - INTERVAL '24 hours')) AS failed_attempts,
                COUNT(*) FILTER (WHERE status = 'SUCCESS' AND attempted_at > (NOW() - INTERVAL '24 hours')) AS successful_logins
            FROM {AUTH_ATTEMPT_LOGS_TABLE}
        """
        rows = await DatabaseManager.execute_db_select(query=select_stats_query)
        stats = rows[0] if rows else {}
        return {
            "total_attempts_24h": int(stats.get("total_attempts") or 0),
            "failed_attempts_24h": int(stats.get("failed_attempts") or 0),
            "successful_logins_24h": int(stats.get("successful_logins") or 0),
        }
