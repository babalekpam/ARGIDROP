-- Consumer (B2C) orders: track the individual user who created the job
-- and flag/track the 5% consumer surcharge.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES users(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_consumer_order boolean DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS consumer_surcharge numeric(10,2) DEFAULT 0.00;
CREATE INDEX IF NOT EXISTS idx_jobs_created_by_user ON jobs (created_by_user_id) WHERE created_by_user_id IS NOT NULL;
