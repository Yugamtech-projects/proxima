"""
PROXIMA Backend Configuration Management.
Loads environment variables using python-dotenv and defines centralized qualified table names.
"""

import os
from typing import List
from dotenv import load_dotenv

# load_dotenv() searches current working directory and traverses parent directories to find .env
load_dotenv()

DEV_ENV: bool = os.getenv("DEV_ENV", "False").lower() in ("true", "1", "t")

PORT: int = int(os.getenv("PORT", "5051"))
HOST: str = os.getenv("HOST", "0.0.0.0")

DATABASE_URL: str = os.getenv("DATABASE_URL", "")

# Schema Configuration: Defaults to production "Proxima" schema or reads explicit DATABASE_SCHEMA
DATABASE_SCHEMA: str = os.getenv("DATABASE_SCHEMA", "Proxima")

# Centralized Qualified Database Table Names (including dynamic schema prefix)
CHAPTERS_TABLE: str = f'"{DATABASE_SCHEMA}".chapters'
USERS_TABLE: str = f'"{DATABASE_SCHEMA}".users'
MEMBERS_TABLE: str = f'"{DATABASE_SCHEMA}".members'
LICENSES_TABLE: str = f'"{DATABASE_SCHEMA}".licenses'
VIP_PASSES_TABLE: str = f'"{DATABASE_SCHEMA}".vip_passes'
AUTH_ATTEMPT_LOGS_TABLE: str = f'"{DATABASE_SCHEMA}".auth_attempt_logs'

JWT_SECRET: str = os.getenv("JWT_SECRET")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
raw_expire = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(raw_expire.strip()) if raw_expire and raw_expire.strip().isdigit() else 1440

RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET")
RAZORPAY_WEBHOOK_SECRET: str = os.getenv("RAZORPAY_WEBHOOK_SECRET")

RATE_LIMIT_DEFAULT: List[str] = [os.getenv("RATE_LIMIT_DEFAULT", "120/minute")]
RATE_LIMIT_AUTH: str = os.getenv("RATE_LIMIT_AUTH", "15/minute")
RATE_LIMIT_API: str = os.getenv("RATE_LIMIT_API", "60/minute")

raw_cors: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5051,http://127.0.0.1:5173,http://127.0.0.1:5051,https://proxima.network,https://www.proxima.network")
CORS_ORIGINS: List[str] = [origin.strip() for origin in raw_cors.split(",") if origin.strip()]
