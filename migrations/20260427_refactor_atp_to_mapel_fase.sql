-- Refactor ATP to be Phase and Subject based
ALTER TABLE atp ADD COLUMN mapel_id VARCHAR(36) AFTER id;
ALTER TABLE atp ADD COLUMN fase ENUM('A', 'B', 'C', 'D', 'E', 'F') AFTER mapel_id;
ALTER TABLE atp ADD COLUMN tahun_ajaran VARCHAR(20) AFTER fase;

-- Make pembelajaran_id nullable because ATP is now global per Mapel/Fase
ALTER TABLE atp MODIFY COLUMN pembelajaran_id VARCHAR(36) NULL;

-- Add Foreign Key for mapel_id
ALTER TABLE atp ADD CONSTRAINT fk_atp_mapel FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id);

-- Optional: Indexing for faster lookups
CREATE INDEX idx_atp_mapel_fase ON atp(mapel_id, fase, tahun_ajaran);
