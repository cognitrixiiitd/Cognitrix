-- ============================================================
-- Migration: Add password column to professor_applications
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

ALTER TABLE professor_applications 
ADD COLUMN IF NOT EXISTS password text;
