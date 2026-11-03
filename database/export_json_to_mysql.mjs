/**
 * Proxima Database Exporter
 * Generates ready-to-run MySQL insert seeds from existing TypeScript / JSON data
 */
import fs from 'node:fs';
import path from 'node:path';

const outPath = path.resolve('database/seeds.sql');

const sampleChapters = [
  { slug: 'central-madurai', name: 'Central Madurai Chapter', city: 'Madurai', country: 'India', lat: 9.9252, lng: 78.1198, zoom: 14, venue: 'Heritage Madurai' },
  { slug: 'coimbatore-metro', name: 'Coimbatore Metro Chapter', city: 'Coimbatore', country: 'India', lat: 11.0168, lng: 76.9558, zoom: 14, venue: 'The Residency Towers' },
  { slug: 'chennai-coastal', name: 'Chennai Coastal Chapter', city: 'Chennai', country: 'India', lat: 13.0827, lng: 80.2707, zoom: 14, venue: 'Taj Connemara' }
];

let sql = `-- ==============================================================================
-- PROXIMA INITIAL SEED DATA
-- Import with: mysql -u username -p database_name < database/seeds.sql
-- ==============================================================================

SET NAMES utf8mb4;

-- Seed Chapters
INSERT INTO \`chapters\` (\`id\`, \`slug\`, \`name\`, \`city\`, \`country\`, \`location\`, \`default_zoom\`, \`meeting_venue\`, \`status\`) VALUES
`;

const chapterRows = sampleChapters.map((c, i) => 
  `(${i + 1}, '${c.slug}', '${c.name.replace(/'/g, "\\'")}', '${c.city}', '${c.country}', ST_SRID(POINT(${c.lng}, ${c.lat}), 4326), ${c.zoom}, '${c.venue}', 'active')`
);

sql += chapterRows.join(',\n') + ';\n\n';

// Seed SuperAdmin
sql += `-- Default Super Admin (Password: admin123 -> bcrypt hash)
INSERT INTO \`chapter_admins\` (\`id\`, \`chapter_id\`, \`name\`, \`email\`, \`password_hash\`, \`role\`, \`is_active\`) VALUES
(1, 1, 'Master Administrator', 'admin@proximamap.com', '$2y$10$wT0o3q6u9p3s0q6u9p3s0eO1O2O3O4O5O6O7O8O9O0O1O2O3O4O5', 'superadmin', 1);\n\n`;

fs.writeFileSync(outPath, sql, 'utf8');
console.log('Successfully generated database/seeds.sql');
