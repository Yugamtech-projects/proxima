"""
PROXIMA Data Migration Script.
Standalone script to migrate existing flat-file JSON records (data/proxima_db.json)
into the active PostgreSQL schema (Proxima or Proxima_dev).
Usage:
    cd server && poetry run python migrate.py
"""

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy import text

from config.config import DATABASE_SCHEMA, CHAPTERS_TABLE, USERS_TABLE, LICENSES_TABLE, MEMBERS_TABLE
from database.database import DatabaseManager
from utils.logger import logger


def _parse_iso_date(iso_str):
    """Parses an ISO date string into a datetime object for asyncpg TIMESTAMPTZ columns."""
    if not iso_str:
        return None
    try:
        return datetime.fromisoformat(str(iso_str).replace("Z", "+00:00"))
    except Exception:
        return None


async def migrate_data():
    """Migrates chapters, users, licenses, and members from proxima_db.json to PostgreSQL."""
    db_json_path = Path(__file__).resolve().parent.parent / "data" / "proxima_db.json"
    if not db_json_path.exists():
        logger.error("Source JSON database not found at %s", db_json_path)
        return

    logger.info("Starting Proxima database migration into schema '%s'...", DATABASE_SCHEMA)
    raw = json.loads(db_json_path.read_text(encoding="utf-8"))
    engine = DatabaseManager.get_engine()

    counts = {"chapters": 0, "users": 0, "licenses": 0, "members": 0}

    async with engine.begin() as conn:
        # 1. Ensure PostGIS and target schema exist
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{DATABASE_SCHEMA}";'))

        # 2. Migrate Chapters
        for c in raw.get("chapters", []):
            await conn.execute(
                text(f"""
                    INSERT INTO {CHAPTERS_TABLE} (id, slug, name, organization_type, city, access_key, status)
                    VALUES (:id, :slug, :name, :organization_type, :city, :access_key, :status)
                    ON CONFLICT (id) DO UPDATE SET
                        slug = EXCLUDED.slug,
                        name = EXCLUDED.name,
                        organization_type = EXCLUDED.organization_type,
                        city = EXCLUDED.city,
                        access_key = EXCLUDED.access_key,
                        status = EXCLUDED.status
                """),
                {
                    "id": c["id"],
                    "slug": c["slug"],
                    "name": c["name"],
                    "organization_type": c.get("organizationType", "Business Forum"),
                    "city": c["city"],
                    "access_key": c["accessKey"],
                    "status": c.get("status", "ACTIVE"),
                },
            )
            counts["chapters"] += 1

        # 3. Migrate Master Admin
        master = raw.get("masterAdmin", {})
        if master:
            await conn.execute(
                text(f"""
                    INSERT INTO {USERS_TABLE} (id, chapter_id, chapter_slug, chapter_name, email, name, password_hash, role, is_active)
                    VALUES (:id, NULL, NULL, NULL, :email, :name, :password_hash, 'MASTER_ADMIN', true)
                    ON CONFLICT (email) DO UPDATE SET
                        name = EXCLUDED.name,
                        password_hash = EXCLUDED.password_hash
                """),
                {
                    "id": "admin-master",
                    "email": master.get("email", "admin@proxima.network"),
                    "name": master.get("name", "Master Super Admin"),
                    "password_hash": master.get("passwordHash", ""),
                },
            )
            counts["users"] += 1

        # 4. Migrate Chapter Admins
        for ca in raw.get("chapterAdmins", []):
            await conn.execute(
                text(f"""
                    INSERT INTO {USERS_TABLE} (id, chapter_id, chapter_slug, chapter_name, email, name, password_hash, role, is_active)
                    VALUES (:id, :chapter_id, :chapter_slug, :chapter_name, :email, :name, :password_hash, 'CHAPTER_ADMIN', true)
                    ON CONFLICT (email) DO UPDATE SET
                        chapter_id = EXCLUDED.chapter_id,
                        chapter_slug = EXCLUDED.chapter_slug,
                        chapter_name = EXCLUDED.chapter_name,
                        password_hash = EXCLUDED.password_hash
                """),
                {
                    "id": ca["id"],
                    "chapter_id": ca["chapterId"],
                    "chapter_slug": ca.get("chapterSlug"),
                    "chapter_name": ca.get("chapterName"),
                    "email": ca["email"],
                    "name": f"{ca.get('chapterName', 'Chapter')} Admin",
                    "password_hash": ca.get("passwordHash", ""),
                },
            )
            counts["users"] += 1

        # 5. Migrate Licenses & Invoices (for existing chapters)
        valid_chapter_ids = {c["id"] for c in raw.get("chapters", [])}
        for chap_id, lic in raw.get("licenses", {}).items():
            if chap_id not in valid_chapter_ids:
                continue

            valid_dt = _parse_iso_date(lic.get("validUntil")) or datetime.now(timezone.utc)
            last_pay_dt = _parse_iso_date(lic.get("lastPaymentDate"))

            await conn.execute(
                text(f"""
                    INSERT INTO {LICENSES_TABLE} (id, chapter_id, status, plan, price_inr, valid_until, last_payment_date, last_payment_id, last_order_id, invoices)
                    VALUES (:id, :chapter_id, :status, :plan, :price_inr, :valid_until, :last_payment_date, :last_payment_id, :last_order_id, :invoices)
                    ON CONFLICT (chapter_id) DO UPDATE SET
                        status = EXCLUDED.status,
                        plan = EXCLUDED.plan,
                        price_inr = EXCLUDED.price_inr,
                        valid_until = EXCLUDED.valid_until,
                        last_payment_date = EXCLUDED.last_payment_date,
                        last_payment_id = EXCLUDED.last_payment_id,
                        last_order_id = EXCLUDED.last_order_id,
                        invoices = EXCLUDED.invoices
                """),
                {
                    "id": f"lic-{chap_id}",
                    "chapter_id": chap_id,
                    "status": lic.get("status", "ACTIVE"),
                    "plan": lic.get("plan", "Annual Chapter License (₹1,999 / 1 Year)"),
                    "price_inr": float(lic.get("priceInr", 1999)),
                    "valid_until": valid_dt,
                    "last_payment_date": last_pay_dt,
                    "last_payment_id": lic.get("lastPaymentId"),
                    "last_order_id": lic.get("lastOrderId"),
                    "invoices": json.dumps(lic.get("invoices", [])),
                },
            )
            counts["licenses"] += 1

        # 6. Migrate Members (if any exist in JSON)
        for chap_id, member_list in raw.get("members", {}).items():
            for m in member_list:
                loc = m.get("location", {})
                tags = m.get("tags", [])
                await conn.execute(
                    text(f"""
                        INSERT INTO {MEMBERS_TABLE} (id, chapter_id, name, company, category, category_id, category_icon, short_bio, phone, whatsapp, email, website, photo_url, location, one_to_one_availability, referral_requirements, tags, membership_status, is_visible)
                        VALUES (:id, :chapter_id, :name, :company, :category, :category_id, :category_icon, :short_bio, :phone, :whatsapp, :email, :website, :photo_url, :location, :one_to_one_availability, :referral_requirements, :tags, :membership_status, :is_visible)
                        ON CONFLICT (id) DO NOTHING
                    """),
                    {
                        "id": m["id"],
                        "chapter_id": chap_id,
                        "name": m.get("name", ""),
                        "company": m.get("company", ""),
                        "category": m.get("category", ""),
                        "category_id": m.get("categoryId", m.get("category_id", "general")),
                        "category_icon": m.get("categoryIcon", m.get("category_icon", "Briefcase")),
                        "short_bio": m.get("shortBio", m.get("short_bio")),
                        "phone": m.get("phone", ""),
                        "whatsapp": m.get("whatsapp"),
                        "email": m.get("email", ""),
                        "website": m.get("website"),
                        "photo_url": m.get("photoUrl", m.get("photo_url")),
                        "location": json.dumps(loc) if isinstance(loc, dict) else "{}",
                        "one_to_one_availability": m.get("oneToOneAvailability", m.get("one_to_one_availability", "AVAILABLE")),
                        "referral_requirements": m.get("referralRequirements", m.get("referral_requirements")),
                        "tags": json.dumps(tags) if isinstance(tags, list) else "[]",
                        "membership_status": m.get("membershipStatus", m.get("membership_status", "RENEWED")),
                        "is_visible": bool(m.get("isVisible", m.get("is_visible", True))),
                    },
                )
                counts["members"] += 1

    logger.info(
        "Migration completed successfully!\n"
        "Values: chapters=%d, users=%d, licenses=%d, members=%d",
        counts["chapters"],
        counts["users"],
        counts["licenses"],
        counts["members"],
    )


if __name__ == "__main__":
    asyncio.run(migrate_data())
