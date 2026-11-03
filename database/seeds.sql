-- ==============================================================================
-- PROXIMA INITIAL SEED DATA
-- Import with: mysql -u username -p database_name < database/seeds.sql
-- ==============================================================================

SET NAMES utf8mb4;

-- Seed Chapters
INSERT INTO `chapters` (`id`, `slug`, `name`, `city`, `country`, `location`, `default_zoom`, `meeting_venue`, `status`) VALUES
(1, 'central-madurai', 'Central Madurai Chapter', 'Madurai', 'India', ST_SRID(POINT(78.1198, 9.9252), 4326), 14, 'Heritage Madurai', 'active'),
(2, 'coimbatore-metro', 'Coimbatore Metro Chapter', 'Coimbatore', 'India', ST_SRID(POINT(76.9558, 11.0168), 4326), 14, 'The Residency Towers', 'active'),
(3, 'chennai-coastal', 'Chennai Coastal Chapter', 'Chennai', 'India', ST_SRID(POINT(80.2707, 13.0827), 4326), 14, 'Taj Connemara', 'active');

-- Default Super Admin (Password: admin123 -> bcrypt hash)
INSERT INTO `chapter_admins` (`id`, `chapter_id`, `name`, `email`, `password_hash`, `role`, `is_active`) VALUES
(1, 1, 'Master Administrator', 'admin@proximamap.com', '$2y$10$wT0o3q6u9p3s0q6u9p3s0eO1O2O3O4O5O6O7O8O9O0O1O2O3O4O5', 'superadmin', 1);

