-- Idempotent sync of schema objects that predate this migration system:
-- driver level columns, driver_achievements, corporate_accounts, corporate_invoices.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'driver_level') THEN
    CREATE TYPE driver_level AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'corporate_account_status') THEN
    CREATE TYPE corporate_account_status AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'corporate_billing_cycle') THEN
    CREATE TYPE corporate_billing_cycle AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');
  END IF;
END $$;

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS level driver_level DEFAULT 'BRONZE',
  ADD COLUMN IF NOT EXISTS level_updated_at timestamp,
  ADD COLUMN IF NOT EXISTS level_bonus_pct numeric(4,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS has_accident_insurance boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_rides_all_time integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS driver_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  badge_type text NOT NULL,
  badge_name text NOT NULL,
  badge_name_fr text,
  description text,
  description_fr text,
  awarded_at timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS driver_achievements_driver_badge_unique
  ON driver_achievements (driver_id, badge_type);

CREATE TABLE IF NOT EXISTS corporate_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  account_manager_id uuid REFERENCES users(id),
  contract_ref text UNIQUE,
  commission_rate numeric(4,2) NOT NULL DEFAULT 10.00,
  billing_cycle corporate_billing_cycle DEFAULT 'MONTHLY',
  credit_limit numeric(14,2) DEFAULT 0.00,
  current_credit_used numeric(14,2) DEFAULT 0.00,
  currency text DEFAULT 'XOF',
  cod_enabled boolean DEFAULT false,
  api_access_enabled boolean DEFAULT false,
  api_key text UNIQUE,
  sla_match_guarantee_mins integer DEFAULT 20,
  sla_delivery_guarantee_mins integer,
  status corporate_account_status DEFAULT 'ACTIVE',
  activated_at timestamp DEFAULT now(),
  expires_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS corporate_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id uuid NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  invoice_number text UNIQUE NOT NULL,
  period_start timestamp NOT NULL,
  period_end timestamp NOT NULL,
  deliveries_count integer DEFAULT 0,
  gross_amount numeric(14,2) NOT NULL,
  commission_amount numeric(14,2) NOT NULL,
  net_amount numeric(14,2) NOT NULL,
  currency text DEFAULT 'XOF',
  status text DEFAULT 'DRAFT',
  sent_at timestamp,
  paid_at timestamp,
  due_at timestamp,
  pdf_url text,
  created_at timestamp DEFAULT now()
);
