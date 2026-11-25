"""
Async PostgreSQL Database Manager for Proxima.
Configured for Supabase Transaction Pooler (PgBouncer on Port 6543) and PostGIS.
Executes multi-line parameterized raw SQL queries across the application.
"""

import ssl
import time
import asyncio
import socket
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.engine.url import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from models import ALL_TABLES_SQL
from config.config import DATABASE_SCHEMA, DATABASE_URL
from utils.logger import logger


class DatabaseManager:
    """
    Central Database Manager for Proxima.
    Features:
    - PgBouncer-compatible connection pool settings with unnamed prepared statements
    - Automatic schema and table provisioning (Proxima vs Proxima_dev)
    - Connection warmup with DNS retry backoff
    - Direct multi-line SQL execution helpers (execute_db_query, execute_db_select, execute_db_insert, execute_db_update, execute_db_delete)
    """

    _engine: Optional[AsyncEngine] = None


    @staticmethod
    def _format_duration(elapsed_seconds: float) -> str:
        """Return a human-friendly startup duration string."""
        if elapsed_seconds >= 1.0:
            return f"{elapsed_seconds:.2f} s"
        return f"{elapsed_seconds * 1000:.2f} ms"


    @classmethod
    def get_engine(cls) -> AsyncEngine:
        """Initializes and returns the PostgreSQL Async Engine configured for Supabase Pooler."""
        if not cls._engine:
            connection_string = DATABASE_URL
            if not connection_string:
                raise ValueError("Database connection string not found in environment!")

            try:
                url = make_url(connection_string).set(drivername="postgresql+asyncpg")

                ca_path = Path(__file__).resolve().parent / "supabase-ca.pem"
                if ca_path.exists():
                    ssl_ctx = ssl.create_default_context(cafile=str(ca_path))
                    ssl_ctx.verify_mode = ssl.CERT_REQUIRED
                    ssl_ctx.check_hostname = False
                    logger.info("Configured database connection with verified CA bundle (%s)", ca_path.name)
                else:
                    ssl_ctx = ssl.create_default_context()
                    ssl_ctx.check_hostname = False
                    ssl_ctx.verify_mode = ssl.CERT_NONE

                cls._engine = create_async_engine(
                    url,
                    pool_size=10,
                    max_overflow=20,
                    pool_timeout=30,
                    pool_recycle=300,
                    pool_pre_ping=True,
                    echo=False,
                    connect_args={
                        "ssl": ssl_ctx,
                        "prepared_statement_cache_size": 0,
                        "statement_cache_size": 0,
                        "prepared_statement_name_func": lambda: "",
                    },
                )
            except Exception as e:
                logger.error("Database engine initialization failed: %s", e)
                raise
        return cls._engine


    @staticmethod
    async def warmup_database_service():
        """Ensure schema, extensions, and tables exist; pre-warm a connection to reduce first-query latency."""
        engine = DatabaseManager.get_engine()
        max_attempts = 3
        base_retry_delay_seconds = 2

        for attempt in range(1, max_attempts + 1):
            start = time.perf_counter()
            try:
                async with engine.begin() as conn:
                    # Enable PostGIS extension
                    await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))

                    # Create dynamic schema (Proxima or Proxima_dev)
                    await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{DATABASE_SCHEMA}";'))

                    # Provision all 4 core tables and indexes
                    for table_sql in ALL_TABLES_SQL:
                        for statement in table_sql.strip().split(";"):
                            stmt = statement.strip()
                            if stmt:
                                await conn.execute(text(stmt))

                # Pre-warm connection
                async with engine.connect() as conn:
                    await conn.execute(text("SELECT 1"))

                elapsed = time.perf_counter() - start
                engine_url = engine.url
                logger.info(
                    "Database Engine Initialized for host=%s port=%s in %s",
                    engine_url.host,
                    engine_url.port,
                    DatabaseManager._format_duration(elapsed_seconds=elapsed),
                )
                return
            except Exception as e:
                error_message = str(e)
                is_dns_error = (
                    isinstance(e, socket.gaierror)
                    or "Temporary failure in name resolution" in error_message
                )
                logger.error(
                    "Database warmup attempt %s/%s failed: %s",
                    attempt,
                    max_attempts,
                    error_message,
                )

                if is_dns_error and attempt < max_attempts:
                    retry_delay = base_retry_delay_seconds * attempt
                    logger.warning(
                        "Retrying DB warmup in %s seconds due to DNS resolution issue",
                        retry_delay,
                    )
                    await asyncio.sleep(retry_delay)
                    continue
                raise


    @staticmethod
    async def execute_db_query(query: str, params: Optional[Dict[str, Any]] = None):
        """
        Executes a raw SQL query (SELECT, INSERT, UPDATE, DELETE).
        Returns a list of dicts for SELECT/RETURNING queries, otherwise returns True.
        """
        engine = DatabaseManager.get_engine()
        try:
            async with engine.begin() as conn:
                result = await conn.execute(text(query), params or {})
                if result.returns_rows:
                    return [dict(row._mapping) for row in result.fetchall()]
                return True
        except Exception as e:
            logger.error("Query execution failed: %s", e)
            raise HTTPException(status_code=500, detail=str(e))


    @staticmethod
    async def execute_db_select(query: str, params: Optional[Dict[str, Any]] = None):
        return await DatabaseManager.execute_db_query(query=query, params=params)


    @staticmethod
    async def execute_db_insert(query: str, params: Optional[Dict[str, Any]] = None):
        return await DatabaseManager.execute_db_query(query=query, params=params)


    @staticmethod
    async def execute_db_update(query: str, params: Optional[Dict[str, Any]] = None):
        return await DatabaseManager.execute_db_query(query=query, params=params)


    @staticmethod
    async def execute_db_upsert(query: str, params: Optional[Dict[str, Any]] = None):
        return await DatabaseManager.execute_db_query(query=query, params=params)


    @staticmethod
    async def execute_db_delete(query: str, params: Optional[Dict[str, Any]] = None):
        return await DatabaseManager.execute_db_query(query=query, params=params)
