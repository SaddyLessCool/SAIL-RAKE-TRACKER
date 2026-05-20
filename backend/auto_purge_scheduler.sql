-- ============================================================
-- SAIL Rake Tracker — Automated Database Purging Script
-- ============================================================
-- You have two excellent options to run this in your Supabase Postgres Database.
-- 
-- Run these statements in your Supabase Dashboard -> SQL Editor.
-- Make sure the `pg_cron` extension is enabled in your database.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: Enable the pg_cron extension
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─────────────────────────────────────────────────────────────
-- OPTION A: Rolling Purge (HIGHLY RECOMMENDED ⭐)
-- Keeps the most recent 1.5 months (45 days) of logs and reports,
-- while automatically deleting anything older.
-- This ensures your dashboard is NEVER empty.
-- ─────────────────────────────────────────────────────────────

-- Create a reusable function for rolling purge
CREATE OR REPLACE FUNCTION purge_old_data()
RETURNS void AS $$
BEGIN
    -- Delete snapshots older than 45 days (1.5 months).
    -- Cascading relationships will automatically delete related 'records' and 'comparisons'.
    DELETE FROM snapshots 
    WHERE created_at < NOW() - INTERVAL '45 days';
    
    -- Delete events older than 45 days (1.5 months).
    DELETE FROM events 
    WHERE start_time < NOW() - INTERVAL '45 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule the rolling purge to run EVERY DAY at midnight
SELECT cron.schedule(
    'daily-rolling-purge-45d', -- Job Name
    '0 0 * * *',                -- Cron expression (Midnight every day)
    'SELECT purge_old_data();'  -- Query to execute
);


-- ─────────────────────────────────────────────────────────────
-- OPTION B: Complete Wipe (Every 1.5 months)
-- Wipes the content of all tables completely flat every 45 days.
-- Note: Your dashboard will be entirely blank after each wipe until new uploads occur.
-- ─────────────────────────────────────────────────────────────

-- Schedule a complete wipe to run every 45 days at midnight
SELECT cron.schedule(
    'complete-wipe-every-45-days', -- Job Name
    '0 0 */45 * *',                 -- Cron expression (Midnight every 45 days)
    $$
      BEGIN;
        TRUNCATE TABLE snapshots, events, comparisons, records CASCADE;
      COMMIT;
    $$
);


-- ─────────────────────────────────────────────────────────────
-- HELPER: How to manage scheduled jobs
-- ─────────────────────────────────────────────────────────────
-- 
-- 1. View all scheduled cron jobs:
--    SELECT * FROM cron.job;
--
-- 2. View the execution log / history of cron jobs:
--    SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
--
-- 3. Manually unschedule / delete a scheduled cron job:
--    SELECT cron.unschedule('daily-rolling-purge-45d');
--    SELECT cron.unschedule('complete-wipe-every-45-days');
--
