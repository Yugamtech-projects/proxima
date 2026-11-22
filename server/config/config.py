"""
PROXIMA Backend Configuration Management.
Loads environment variables using python-dotenv and defines centralized qualified table names.
"""

import os
from dotenv import load_dotenv

# load_dotenv() searches current working directory and traverses parent directories to find .env
load_dotenv()

DATABASE_URL: str = os.getenv("DATABASE_URL", "")

DEV_ENV: bool = os.getenv("DEV_ENV", "False").lower() in ("true", "1", "t")

# Dynamic Schema Switching:
# DEV_ENV=True  -> Uses "Proxima_dev" schema
# DEV_ENV=False -> Uses production "Proxima" schema
DATABASE_SCHEMA: str = "Proxima_dev" if DEV_ENV else "Proxima"

# Centralized Qualified Database Table Names (including dynamic schema prefix)
CHAPTERS_TABLE: str = f'"{DATABASE_SCHEMA}".chapters'
USERS_TABLE: str = f'"{DATABASE_SCHEMA}".users'
MEMBERS_TABLE: str = f'"{DATABASE_SCHEMA}".members'
LICENSES_TABLE: str = f'"{DATABASE_SCHEMA}".licenses'

PORT: int = int(os.getenv("PORT", "5051"))
HOST: str = os.getenv("HOST", "0.0.0.0")

JWT_SECRET: str = os.getenv("JWT_SECRET")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET")
RAZORPAY_WEBHOOK_SECRET: str = os.getenv("RAZORPAY_WEBHOOK_SECRET")
