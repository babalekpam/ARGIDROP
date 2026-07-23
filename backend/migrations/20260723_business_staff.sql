-- Merchant team members: extra user accounts operating a business (idempotent).
CREATE TABLE IF NOT EXISTS business_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'STAFF',
  invited_by uuid REFERENCES users(id),
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_staff_business ON business_staff (business_id);
