-- Migration: absensi_enhancements
-- Up
-- 1. Add missing columns to absensi table
ALTER TABLE absensi 
    ADD COLUMN catatan TEXT AFTER longitude_keluar,
    ADD COLUMN foto_masuk VARCHAR(255) AFTER catatan,
    ADD COLUMN foto_keluar VARCHAR(255) AFTER foto_masuk;

-- 2. Create pengaturan_absensi table
CREATE TABLE IF NOT EXISTS pengaturan_absensi (
    sekolah_id VARCHAR(36) PRIMARY KEY COLLATE utf8mb4_unicode_ci,
    jam_masuk_mulai TIME NOT NULL DEFAULT '06:30:00',
    jam_masuk_akhir TIME NOT NULL DEFAULT '07:15:00',
    jam_pulang_mulai TIME NOT NULL DEFAULT '14:30:00',
    jam_pulang_akhir TIME NOT NULL DEFAULT '17:00:00',
    hari_kerja JSON,
    radius_meter INT DEFAULT 100,
    FOREIGN KEY (sekolah_id) REFERENCES sekolah(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create hari_libur table
CREATE TABLE IF NOT EXISTS hari_libur (
    id VARCHAR(36) PRIMARY KEY COLLATE utf8mb4_unicode_ci,
    sekolah_id VARCHAR(36) NOT NULL COLLATE utf8mb4_unicode_ci,
    tanggal DATE NOT NULL,
    keterangan VARCHAR(255),
    is_nasional BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (sekolah_id) REFERENCES sekolah(id) ON DELETE CASCADE,
    UNIQUE KEY (sekolah_id, tanggal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Insert default settings for existing schools
INSERT IGNORE INTO pengaturan_absensi (sekolah_id, hari_kerja) 
SELECT id, '["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]' FROM sekolah;

-- Down
-- (Note: Reverting these changes might be destructive, use with caution)
-- DROP TABLE IF EXISTS hari_libur;
-- DROP TABLE IF EXISTS pengaturan_absensi;
-- ALTER TABLE absensi DROP COLUMN catatan, DROP COLUMN foto_masuk, DROP COLUMN foto_keluar;
