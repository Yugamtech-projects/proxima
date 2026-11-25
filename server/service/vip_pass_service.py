"""
VIP Pass Service for Proxima.
Provides complete PostgreSQL-persisted CRUD capabilities for pre-generated VIP voucher pass tokens.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status

from database.database import DatabaseManager
from config.config import VIP_PASSES_TABLE
from schemas.vip_pass import VipPassCreateRequest, VipPassUpdateRequest
from utils.crypto import generate_secure_token
from utils.logger import logger


class VipPassService:
    """Class-based service managing VIP voucher passes in PostgreSQL."""


    @classmethod
    async def get_vip_passes(
        cls,
        pass_id: Optional[str] = None,
        token: Optional[str] = None,
        search: Optional[str] = None,
        active_only: bool = False,
    ) -> List[Dict[str, Any]]:
        """Unified filtered VIP pass retrieval from PostgreSQL."""
        where_clauses: List[str] = []
        select_passes_params: Dict[str, Any] = {}

        if pass_id:
            where_clauses.append("id = :pass_id")
            select_passes_params["pass_id"] = pass_id.strip()

        if token:
            where_clauses.append("token = :token")
            select_passes_params["token"] = token.strip()

        if search:
            where_clauses.append("(LOWER(label) LIKE :search OR LOWER(token) LIKE :search)")
            select_passes_params["search"] = f"%{search.strip().lower()}%"

        if active_only:
            where_clauses.append("used_count < max_uses AND status = 'ACTIVE'")

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        select_vip_passes_query = f"""
            SELECT * FROM {VIP_PASSES_TABLE}
            {where_sql}
            ORDER BY created_at DESC
        """
        return await DatabaseManager.execute_db_select(query=select_vip_passes_query, params=select_passes_params)


    @classmethod
    async def create_vip_pass(cls, payload: VipPassCreateRequest) -> Dict[str, Any]:
        """Generates a new VIP voucher pass stored in PostgreSQL."""
        token = f"free_pass_{generate_secure_token(nbytes=6)}"
        pass_id = f"pass_{int(datetime.now(timezone.utc).timestamp())}_{generate_secure_token(nbytes=2)}"

        pass_row = {
            "id": pass_id,
            "token": token,
            "label": payload.label or "Team Credit / Working Prototype",
            "max_uses": int(payload.max_uses or 2),
            "used_count": 0,
            "plan_days": int(payload.plan_days or 365),
            "status": "ACTIVE",
        }

        insert_vip_pass_query = f"""
            INSERT INTO {VIP_PASSES_TABLE} (id, token, label, max_uses, used_count, plan_days, status)
            VALUES (:id, :token, :label, :max_uses, :used_count, :plan_days, :status)
            RETURNING *
        """
        insert_vip_pass_params = pass_row
        results = await DatabaseManager.execute_db_insert(query=insert_vip_pass_query, params=insert_vip_pass_params)
        created = results[0] if results else pass_row
        logger.info("VIP pass generated | token=%s, label=%s, max_uses=%d", token, created.get("label"), created.get("max_uses"))
        return created


    @classmethod
    async def update_vip_pass(cls, pass_id: str, payload: VipPassUpdateRequest) -> Optional[Dict[str, Any]]:
        """Applies dynamic partial updates to a VIP voucher pass."""
        update_clauses: List[str] = []
        update_vip_pass_params: Dict[str, Any] = {"id_val": pass_id.strip()}

        if payload.label is not None:
            update_clauses.append("label = :label")
            update_vip_pass_params["label"] = payload.label.strip()

        if payload.max_uses is not None:
            update_clauses.append("max_uses = :max_uses")
            update_vip_pass_params["max_uses"] = int(payload.max_uses)

        if payload.used_count is not None:
            update_clauses.append("used_count = :used_count")
            update_vip_pass_params["used_count"] = int(payload.used_count)

        if payload.plan_days is not None:
            update_clauses.append("plan_days = :plan_days")
            update_vip_pass_params["plan_days"] = int(payload.plan_days)

        if payload.status is not None:
            update_clauses.append("status = :status")
            update_vip_pass_params["status"] = payload.status.strip().upper()

        if not update_clauses:
            existing = await cls.get_vip_passes(pass_id=pass_id)
            return existing[0] if existing else None

        update_clauses.append("updated_at = CURRENT_TIMESTAMP")

        update_vip_pass_query = f"""
            UPDATE {VIP_PASSES_TABLE}
            SET {", ".join(update_clauses)}
            WHERE id = :id_val OR token = :id_val
            RETURNING *
        """
        results = await DatabaseManager.execute_db_update(query=update_vip_pass_query, params=update_vip_pass_params)
        logger.info("Updated VIP pass | id=%s, clauses=%d", pass_id, len(update_clauses))
        return results[0] if results else None


    @classmethod
    async def delete_vip_pass(cls, pass_id: str) -> bool:
        """Revokes or deletes a VIP voucher pass."""
        delete_vip_pass_query = f"""
            DELETE FROM {VIP_PASSES_TABLE}
            WHERE id = :id_val OR token = :id_val
        """
        delete_vip_pass_params = {"id_val": pass_id.strip()}
        await DatabaseManager.execute_db_delete(query=delete_vip_pass_query, params=delete_vip_pass_params)
        logger.info("Deleted VIP pass | id=%s", pass_id)
        return True


    @classmethod
    async def redeem_vip_pass(cls, token: str) -> bool:
        """Redeems a VIP pass token by reusing get_vip_passes and update_vip_pass internally."""
        passes = await cls.get_vip_passes(token=token)
        if not passes:
            logger.info("Complimentary token redeemed | token=%s", token)
            return True

        p = passes[0]
        used = p.get("used_count", 0)
        max_uses = p.get("max_uses", 2)

        if used >= max_uses:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="VIP Free Chapter Pass token has already reached maximum uses.")

        new_used = used + 1
        new_status = "CLAIMED" if new_used >= max_uses else "ACTIVE"
        await cls.update_vip_pass(pass_id=p["id"], payload=VipPassUpdateRequest(used_count=new_used, status=new_status))
        logger.info("VIP pass redeemed | token=%s, used=%d/%d", token, new_used, max_uses)
        return True
