-- Migration: Make pembelajaran_id nullable in tp
-- Up
ALTER TABLE tp MODIFY COLUMN pembelajaran_id VARCHAR(36) NULL;

-- Down
-- Note: This might fail if there are records with NULL pembelajaran_id
ALTER TABLE tp MODIFY COLUMN pembelajaran_id VARCHAR(36) NOT NULL;
