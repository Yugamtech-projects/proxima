"""
License Service for Proxima.
Provides complete PostgreSQL-persisted CRUD capabilities for chapter licenses.
"""

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

from database.database import DatabaseManager
from config.config import LICENSES_TABLE
from schemas.license import (
    LicenseCreateRequest,
    LicenseUpdateRequest,
    LICENSE_PLAN_TITLES,
)
from utils.crypto import generate_secure_token
from utils.logger import logger


class LicenseService:
    """Class-based service managing chapter licenses in PostgreSQL."""


    @staticmethod
    def _format_license_row(license_row: Dict[str, Any]) -> Dict[str, Any]:
        """Normalizes a license database row in pure snake_case."""
        formatted = dict(license_row)
        if isinstance(formatted.get("invoices"), str):
            try:
                formatted["invoices"] = json.loads(formatted["invoices"])
            except Exception:
                formatted["invoices"] = []
        elif formatted.get("invoices") is None:
            formatted["invoices"] = []
        return formatted


    @classmethod
    async def get_licenses(cls, chapter_id: Optional[str] = None, license_status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Unified filtered license retrieval from PostgreSQL."""
        where_clauses: List[str] = []
        select_licenses_params: Dict[str, Any] = {}

        if chapter_id:
            where_clauses.append("chapter_id = :chapter_id")
            select_licenses_params["chapter_id"] = str(chapter_id)

        if license_status:
            where_clauses.append("status = :status")
            select_licenses_params["status"] = license_status.strip().upper()

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        select_licenses_query = f"""
            SELECT * FROM {LICENSES_TABLE}
            {where_sql}
            ORDER BY created_at DESC
        """
        raw_licenses = await DatabaseManager.execute_db_select(query=select_licenses_query, params=select_licenses_params)
        return [cls._format_license_row(license_row=row) for row in raw_licenses]


    @classmethod
    async def create_license(cls, payload: LicenseCreateRequest) -> Dict[str, Any]:
        """Creates or assigns a chapter license in PostgreSQL."""
        if not payload.chapter_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chapter ID required.")

        now_dt = datetime.now(timezone.utc)
        current_licenses = await cls.get_licenses(chapter_id=payload.chapter_id)
        current = current_licenses[0] if current_licenses else None

        base_time = now_dt
        if current and current.get("valid_until"):
            try:
                curr_expiry = datetime.fromisoformat(str(current["valid_until"]).replace("Z", "+00:00"))
                if curr_expiry > now_dt:
                    base_time = curr_expiry
            except Exception:
                pass

        duration = payload.duration_days or 365
        price = float(payload.price_inr or 0.0)
        raw_plan = payload.plan or ("COMPLIMENTARY" if price == 0 else "ANNUAL")
        plan_name = LICENSE_PLAN_TITLES.get(raw_plan, raw_plan)
        new_valid_until = base_time + (datetime.fromtimestamp(duration * 86400, timezone.utc) - datetime.fromtimestamp(0, timezone.utc))

        new_invoice = {
            "id": f"inv_{generate_secure_token(nbytes=4)}",
            "date": now_dt.strftime("%d %b %Y"),
            "amount": price,
            "plan": plan_name,
            "payment_id": f"credit_{generate_secure_token(nbytes=4)}",
            "order_id": "grant_license",
            "status": "PAID",
        }

        existing_invoices = current.get("invoices", []) if current else []
        updated_invoices = [new_invoice] + existing_invoices

        license_row = {
            "id": f"lic-{payload.chapter_id}",
            "chapter_id": payload.chapter_id,
            "status": payload.status or "ACTIVE",
            "plan": plan_name,
            "price_inr": price,
            "valid_until": new_valid_until,
            "last_payment_date": now_dt,
            "last_payment_id": new_invoice["payment_id"],
            "last_order_id": "grant_license",
            "invoices": json.dumps(updated_invoices),
        }

        upsert_chapter_license_query = f"""
            INSERT INTO {LICENSES_TABLE} (id, chapter_id, status, plan, price_inr, valid_until, last_payment_date, last_payment_id, last_order_id, invoices)
            VALUES (:id, :chapter_id, :status, :plan, :price_inr, :valid_until, :last_payment_date, :last_payment_id, :last_order_id, :invoices)
            ON CONFLICT (chapter_id) DO UPDATE SET
                id = EXCLUDED.id,
                status = EXCLUDED.status,
                plan = EXCLUDED.plan,
                price_inr = EXCLUDED.price_inr,
                valid_until = EXCLUDED.valid_until,
                last_payment_date = EXCLUDED.last_payment_date,
                last_payment_id = EXCLUDED.last_payment_id,
                last_order_id = EXCLUDED.last_order_id,
                invoices = EXCLUDED.invoices
        """
        upsert_chapter_license_params = license_row
        await DatabaseManager.execute_db_upsert(query=upsert_chapter_license_query, params=upsert_chapter_license_params)

        response_license = {
            **license_row,
            "valid_until": new_valid_until.isoformat(),
            "last_payment_date": now_dt.isoformat(),
            "invoices": updated_invoices,
        }

        logger.info("License created/assigned | chapter_id=%s, plan=%s", payload.chapter_id, plan_name)
        return {"success": True, "license": response_license, "invoice": new_invoice}


    @classmethod
    async def update_license(cls, chapter_id: str, payload: LicenseUpdateRequest) -> Optional[Dict[str, Any]]:
        """Applies dynamic partial updates to a chapter license."""
        update_clauses: List[str] = []
        update_license_params: Dict[str, Any] = {"chapter_id": chapter_id}

        if payload.status is not None:
            update_clauses.append("status = :status")
            update_license_params["status"] = payload.status.strip().upper()

        if payload.plan is not None:
            resolved_plan = LICENSE_PLAN_TITLES.get(payload.plan, payload.plan.strip())
            update_clauses.append("plan = :plan")
            update_license_params["plan"] = resolved_plan

        if payload.price_inr is not None:
            update_clauses.append("price_inr = :price_inr")
            update_license_params["price_inr"] = float(payload.price_inr)

        if payload.valid_until is not None:
            try:
                valid_dt = datetime.fromisoformat(payload.valid_until.replace("Z", "+00:00"))
                update_clauses.append("valid_until = :valid_until")
                update_license_params["valid_until"] = valid_dt
            except Exception:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ISO date format for valid_until.")

        if not update_clauses:
            existing = await cls.get_licenses(chapter_id=chapter_id)
            return existing[0] if existing else None

        update_clauses.append("updated_at = CURRENT_TIMESTAMP")

        update_license_query = f"""
            UPDATE {LICENSES_TABLE}
            SET {", ".join(update_clauses)}
            WHERE id = :chapter_id OR chapter_id = :chapter_id
            RETURNING *
        """
        results = await DatabaseManager.execute_db_update(query=update_license_query, params=update_license_params)
        logger.info("Updated license | chapter_id=%s, clauses=%d", chapter_id, len(update_clauses))
        return cls._format_license_row(lic=results[0]) if results else None


    @classmethod
    async def delete_license(cls, chapter_id: str) -> bool:
        """Deletes/revokes a chapter license."""
        delete_license_query = f"""
            DELETE FROM {LICENSES_TABLE}
            WHERE id = :chapter_id OR chapter_id = :chapter_id
        """
        delete_license_params = {"chapter_id": chapter_id}
        await DatabaseManager.execute_db_delete(query=delete_license_query, params=delete_license_params)
        logger.info("Deleted license | chapter_id=%s", chapter_id)
        return True
