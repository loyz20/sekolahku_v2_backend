-- Migration: Add fase to rombel and mapel_id, fase to tp
-- Up

-- 1. Add fase to rombel
ALTER TABLE rombel ADD COLUMN fase ENUM('A', 'B', 'C', 'D', 'E', 'F') AFTER tingkat;

-- 2. Add mapel_id and fase to tp
ALTER TABLE tp ADD COLUMN mapel_id VARCHAR(36) AFTER pembelajaran_id;
ALTER TABLE tp ADD COLUMN fase ENUM('A', 'B', 'C', 'D', 'E', 'F') AFTER mapel_id;

-- Add foreign key for mapel_id in tp
ALTER TABLE tp ADD CONSTRAINT fk_tp_mapel FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE;

-- Down
ALTER TABLE tp DROP FOREIGN KEY fk_tp_mapel;
ALTER TABLE tp DROP COLUMN fase;
ALTER TABLE tp DROP COLUMN mapel_id;
ALTER TABLE rombel DROP COLUMN fase;
