"""
Licensing, VIP Pass & Complimentary Entitlement Service for Proxima.
"""

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

from database.database import DatabaseManager
from config.config import LICENSES_TABLE
from utils.crypto import generate_secure_token
from utils.logger import logger


class LicensingService:
    """Class-based service managing licenses, VIP passes, and complimentary grants."""

    _vip_passes_store: List[Dict[str, Any]] = []


    @staticmethod
    async def get_chapter_license(chapter_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves active license details and invoice receipts for a chapter."""
        select_chapter_license_query = f"""
            SELECT * FROM {LICENSES_TABLE}
            WHERE chapter_id = :chapter_id
            LIMIT 1
        """
        select_chapter_license_params = {"chapter_id": str(chapter_id)}
        licenses = await DatabaseManager.execute_db_select(query=select_chapter_license_query, params=select_chapter_license_params)
        if not licenses:
            return None

        lic = licenses[0]
        if isinstance(lic.get("invoices"), str):
            try:
                lic["invoices"] = json.loads(lic["invoices"])
            except Exception:
                lic["invoices"] = []
        return lic


    @classmethod
    def get_vip_passes(cls) -> List[Dict[str, Any]]:
        """Lists all active and used VIP Free Chapter Passes."""
        return cls._vip_passes_store


    @classmethod
    def create_vip_pass(cls, label: str = "Team Credit / Working Prototype", max_uses: int = 2, plan_days: int = 365) -> Dict[str, Any]:
        """Generates a new complimentary 1-year VIP pass token."""
        token = f"free_pass_{generate_secure_token(nbytes=6)}"
        pass_item = {
            "id": f"pass_{int(datetime.now(timezone.utc).timestamp())}",
            "token": token,
            "label": label.strip(),
            "maxUses": max_uses,
            "usedCount": 0,
            "planDays": plan_days,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
        cls._vip_passes_store.append(pass_item)
        logger.info("VIP pass generated | token=%s, label=%s, max_uses=%d", token, label, max_uses)
        return pass_item


    @classmethod
    async def grant_free_license(cls, chapter_id: str, reason: str = "Team Credit / Working Prototype", duration_days: int = 365) -> Dict[str, Any]:
        """Directly grants a 100% complimentary license extension to an existing chapter."""
        if not chapter_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chapter ID required.")

        now_dt = datetime.now(timezone.utc)
        current = await cls.get_chapter_license(chapter_id=chapter_id)

        base_time = now_dt
        if current and current.get("valid_until"):
            try:
                curr_expiry = datetime.fromisoformat(str(current["valid_until"]).replace("Z", "+00:00"))
                if curr_expiry > now_dt:
                    base_time = curr_expiry
            except Exception:
                pass

        new_valid_until = base_time + (datetime.fromtimestamp(duration_days * 86400, timezone.utc) - datetime.fromtimestamp(0, timezone.utc))

        new_invoice = {
            "id": f"inv_free_{generate_secure_token(nbytes=4)}",
            "date": now_dt.strftime("%d %b %Y"),
            "amount": 0.0,
            "plan": f"Complimentary License ({reason})",
            "paymentId": f"free_credit_{generate_secure_token(nbytes=4)}",
            "orderId": "free_grant",
            "status": "PAID",
        }

        existing_invoices = current.get("invoices", []) if current else []
        updated_invoices = [new_invoice] + existing_invoices

        license_row = {
            "id": f"lic-{chapter_id}",
            "chapter_id": chapter_id,
            "status": "ACTIVE",
            "plan": "Complimentary License (₹0 / 100% Team Credit)",
            "price_inr": 0.0,
            "valid_until": new_valid_until,
            "last_payment_date": now_dt,
            "last_payment_id": new_invoice["paymentId"],
            "last_order_id": "free_grant",
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
            "validUntil": new_valid_until.isoformat(),
            "lastPaymentDate": now_dt.isoformat(),
            "invoices": updated_invoices,
        }

        logger.info("Complimentary license granted | chapter_id=%s, duration_days=%d", chapter_id, duration_days)
        return {"success": True, "license": response_license, "invoice": new_invoice}
