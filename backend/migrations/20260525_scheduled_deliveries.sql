-- Phase 1 — Scheduled Deliveries
-- Adds SCHEDULED to job_status enum + scheduling columns on jobs.
-- Safe to run multiple times.

-- 1. Enum value (ADD VALUE cannot run in a transaction, but psql script handles it).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'job_status' AND e.enumlabel = 'SCHEDULED'
  ) THEN
    ALTER TYPE job_status ADD VALUE 'SCHEDULED' BEFORE 'POSTED';
  END IF;
END $$;

-- 2. New columns on jobs.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduled_window_end timestamp;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS recurrence_rule text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS preclaimed_at timestamp;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS promoted_at timestamp;

-- 3. Helpful index for the promoter cron.
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_pickup_status
  ON jobs (scheduled_pickup_at)
  WHERE status = 'SCHEDULED';
