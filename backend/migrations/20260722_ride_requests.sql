-- Ride-hailing vertical: persist ride requests (previously in-memory, lost on restart).
-- Idempotent.

DO $$ BEGIN
  CREATE TYPE ride_status AS ENUM ('SEARCHING', 'MATCHED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ride_vehicle_type AS ENUM ('MOTO', 'ZEMIDJAN', 'CAR', 'TRICYCLE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS ride_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id uuid NOT NULL REFERENCES users(id),
  driver_id uuid REFERENCES users(id),
  from_address text NOT NULL,
  from_lat numeric(10,7) NOT NULL,
  from_lng numeric(10,7) NOT NULL,
  to_address text NOT NULL,
  to_lat numeric(10,7) NOT NULL,
  to_lng numeric(10,7) NOT NULL,
  vehicle_type ride_vehicle_type NOT NULL,
  estimated_price integer NOT NULL,
  final_price integer,
  currency text DEFAULT 'XOF',
  status ride_status NOT NULL DEFAULT 'SEARCHING',
  tracking_token text NOT NULL UNIQUE,
  payment_method text NOT NULL,
  notes text,
  created_at timestamp DEFAULT now(),
  accepted_at timestamp,
  started_at timestamp,
  completed_at timestamp,
  cancelled_at timestamp,
  cancel_reason text
);

CREATE INDEX IF NOT EXISTS idx_ride_requests_passenger ON ride_requests (passenger_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ride_requests_driver ON ride_requests (driver_id, created_at DESC) WHERE driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON ride_requests (status) WHERE status IN ('SEARCHING', 'MATCHED', 'ACCEPTED', 'IN_PROGRESS');
