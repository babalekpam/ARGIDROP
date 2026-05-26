-- Widen drivers.trust_score from decimal(4,2) to decimal(5,2) so it can hold
-- the default value 100.00 (max for (4,2) is 99.99, which made every new
-- driver INSERT through the API fail with "numeric field overflow").
-- Idempotent: only runs if the column is still at precision=4.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers'
      AND column_name = 'trust_score'
      AND numeric_precision = 4
  ) THEN
    ALTER TABLE drivers ALTER COLUMN trust_score TYPE numeric(5,2);
  END IF;
END $$;
