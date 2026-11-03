-- ==============================================================================
-- PROXIMA GEOSPATIAL DIRECTORY PLATFORM
-- PRODUCTION MYSQL 8.0+ SCHEMA & SPATIAL ENGINE
-- Designed for Laravel 11 / PHP 8.3 & React Client
-- ==============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

-- ------------------------------------------------------------------------------
-- 1. CHAPTERS (GROUPS)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `chapters`;
CREATE TABLE `chapters` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `slug` VARCHAR(64) NOT NULL UNIQUE,
    `name` VARCHAR(150) NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `country` VARCHAR(100) NOT NULL DEFAULT 'India',
    `location` POINT NOT NULL SRID 4326,
    `default_zoom` INT UNSIGNED DEFAULT 14,
    `meeting_day` VARCHAR(20) NULL,
    `meeting_time` VARCHAR(20) NULL,
    `meeting_venue` VARCHAR(255) NULL,
    `status` ENUM('active', 'inactive', 'trial') DEFAULT 'active',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    SPATIAL INDEX `sx_chapters_location` (`location`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. CHAPTER ADMINISTRATORS (RBAC)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `chapter_admins`;
CREATE TABLE `chapter_admins` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `chapter_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('superadmin', 'chapter_admin', 'coordinator') DEFAULT 'chapter_admin',
    `is_active` BOOLEAN DEFAULT TRUE,
    `last_login_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_admin_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. MEMBERS (DIRECTORY ENTITIES WITH SPATIAL INDEX)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `members`;
CREATE TABLE `members` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `chapter_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `company` VARCHAR(150) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `category_id` VARCHAR(64) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `whatsapp` VARCHAR(30) NULL,
    `email` VARCHAR(150) NOT NULL,
    `location` POINT NOT NULL SRID 4326,
    `latitude` DECIMAL(10, 8) GENERATED ALWAYS AS (ST_Latitude(`location`)) STORED,
    `longitude` DECIMAL(11, 8) GENERATED ALWAYS AS (ST_Longitude(`location`)) STORED,
    `photo_url` VARCHAR(500) NULL,
    `availability` ENUM('available', 'busy', 'on-leave') DEFAULT 'available',
    `status` ENUM('active', 'pending', 'archived') DEFAULT 'active',
    `metadata` JSON NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_member_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`) ON DELETE CASCADE,
    INDEX `ix_members_chapter` (`chapter_id`),
    INDEX `ix_members_category` (`category_id`),
    SPATIAL INDEX `sx_members_location` (`location`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. CHAPTER LICENSES & RAZORPAY BILLING
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `chapter_licenses`;
CREATE TABLE `chapter_licenses` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `chapter_id` BIGINT UNSIGNED NOT NULL,
    `tier` ENUM('standard', 'enterprise') NOT NULL DEFAULT 'standard',
    `billing_cycle` ENUM('monthly', 'quarterly', 'semi_annual', 'annual') NOT NULL,
    `razorpay_order_id` VARCHAR(100) NOT NULL,
    `razorpay_payment_id` VARCHAR(100) NULL,
    `razorpay_signature` VARCHAR(255) NULL,
    `amount_inr` INT UNSIGNED NOT NULL,
    `status` ENUM('pending', 'active', 'expired', 'failed') DEFAULT 'pending',
    `valid_from` TIMESTAMP NULL,
    `valid_until` TIMESTAMP NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_license_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`) ON DELETE CASCADE,
    INDEX `ix_licenses_order` (`razorpay_order_id`),
    INDEX `ix_licenses_validity` (`status`, `valid_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. AUDIT & PROXIMITY TELEMETRY LOGS
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `chapter_id` BIGINT UNSIGNED NULL,
    `admin_id` BIGINT UNSIGNED NULL,
    `action` VARCHAR(100) NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `payload` JSON NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `ix_audit_chapter` (`chapter_id`, `created_at`),
    INDEX `ix_audit_admin` (`admin_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET foreign_key_checks = 1;
