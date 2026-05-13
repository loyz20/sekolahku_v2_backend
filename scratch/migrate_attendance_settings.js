const { pool } = require('../src/config/db');

async function createSettingsTables() {
  try {
    // 1. Table pengaturan_absensi
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pengaturan_absensi (
        sekolah_id VARCHAR(36) PRIMARY KEY COLLATE utf8mb4_unicode_ci,
        jam_masuk_mulai TIME NOT NULL DEFAULT '06:30:00',
        jam_masuk_akhir TIME NOT NULL DEFAULT '07:15:00',
        jam_pulang_mulai TIME NOT NULL DEFAULT '14:30:00',
        jam_pulang_akhir TIME NOT NULL DEFAULT '17:00:00',
        hari_kerja JSON,
        radius_meter INT DEFAULT 100,
        FOREIGN KEY (sekolah_id) REFERENCES sekolah(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table pengaturan_absensi created or already exists');

    // 2. Table hari_libur
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hari_libur (
        id VARCHAR(36) PRIMARY KEY COLLATE utf8mb4_unicode_ci,
        sekolah_id VARCHAR(36) NOT NULL COLLATE utf8mb4_unicode_ci,
        tanggal DATE NOT NULL,
        keterangan VARCHAR(255),
        is_nasional BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (sekolah_id) REFERENCES sekolah(id) ON DELETE CASCADE,
        UNIQUE KEY (sekolah_id, tanggal)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Table hari_libur created or already exists');

    // 3. Optional: Insert default settings for existing schools
    const [schools] = await pool.query('SELECT id FROM sekolah');
    for (const school of schools) {
      await pool.query(`
        INSERT IGNORE INTO pengaturan_absensi (sekolah_id, hari_kerja) 
        VALUES (?, ?)
      `, [school.id, JSON.stringify(["Senin", "Selasa", "Rabu", "Kamis", "Jumat"])]);
    }
    console.log('Default settings inserted for existing schools');

  } catch (e) {
    console.error('Error creating settings tables:', e);
  } finally {
    process.exit();
  }
}

createSettingsTables();
