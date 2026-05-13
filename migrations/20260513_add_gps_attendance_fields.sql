-- Migration: Add GPS Attendance Fields
-- Created at: 2026-05-13

-- Add radius_presensi to sekolah table
ALTER TABLE sekolah ADD COLUMN radius_presensi INT DEFAULT 100;

-- Add extra fields to absensi table for GPS tracking and validation
ALTER TABLE absensi 
  ADD COLUMN distance_masuk DOUBLE DEFAULT NULL,
  ADD COLUMN distance_keluar DOUBLE DEFAULT NULL,
  ADD COLUMN is_mock_location_masuk BOOLEAN DEFAULT FALSE,
  ADD COLUMN is_mock_location_keluar BOOLEAN DEFAULT FALSE,
  ADD COLUMN status_masuk VARCHAR(50) DEFAULT 'Valid',
  ADD COLUMN status_keluar VARCHAR(50) DEFAULT 'Valid';
