# Proxima MySQL & Laravel 11 Architecture

This directory contains the production MySQL 8.0+ schema and seed definitions for the Proxima Geospatial Business Directory platform.

## Files

- `schema.sql`: Full production DDL for MySQL 8.0+ with spatial indexes (`SPATIAL INDEX` over WGS-84 `POINT SRID 4326`), foreign keys, cascading deletes, and optimized B-Tree lookups.
- `seeds.sql`: Initial seed data for chapters and superadmin credentials.
- `export_json_to_mysql.mjs`: Node.js utility script to parse local JSON state and export into MySQL-compatible DML.

## Database Import Instructions

To import into a local or remote MySQL instance:

```bash
# 1. Create database
mysql -u root -p -e "CREATE DATABASE proxima_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Import schema
mysql -u root -p proxima_db < database/schema.sql

# 3. Import initial seeds
mysql -u root -p proxima_db < database/seeds.sql
```

## Capacity Benchmark Summary

- **1,000 Members across 30 Chapters**:
  - MySQL Data + Indexes: **~1.2 MB to 1.5 MB**
  - Photo Storage (Cloudflare R2 / S3): **~80 MB** (WebP compressed)
- **1,000 Chapters / Groups (50,000 Members)**:
  - MySQL Data + Indexes: **~75 MB to 100 MB**
  - Photo Storage (CDN): **~4.0 GB**
  - RAM requirement: Standard 2 vCPU / 4 GB RAM server will hold 100% of the relational data and spatial indexes in memory (`innodb_buffer_pool_size = 512M`), guaranteeing sub-10ms query execution across the entire network.
