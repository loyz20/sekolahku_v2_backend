-- Allow tp_id to be null to support special events like UTS/UAS
ALTER TABLE atp_detail MODIFY COLUMN tp_id VARCHAR(36) NULL;

-- Add catatan column to store event names (UTS, UAS, etc)
ALTER TABLE atp_detail ADD COLUMN catatan VARCHAR(100) AFTER tp_id;
