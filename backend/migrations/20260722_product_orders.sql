-- Consumer shopping: orders placed against merchant_listings (idempotent).

DO $$ BEGIN
  CREATE TYPE product_order_status AS ENUM (
    'PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP',
    'PICKED_UP', 'DELIVERED', 'CANCELLED', 'REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS product_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id),
  customer_id uuid NOT NULL REFERENCES users(id),
  driver_id uuid REFERENCES drivers(id),
  tracking_token text NOT NULL UNIQUE,
  status product_order_status DEFAULT 'PENDING',
  delivery_address text NOT NULL,
  delivery_lat numeric(10,7),
  delivery_lng numeric(10,7),
  delivery_notes text,
  subtotal numeric(10,2) NOT NULL,
  delivery_fee numeric(8,2) NOT NULL,
  service_fee numeric(8,2) DEFAULT 0.00,
  discount_amount numeric(10,2) DEFAULT 0.00,
  total numeric(10,2) NOT NULL,
  currency text DEFAULT 'XOF',
  payment_provider payment_provider,
  payment_ref text,
  payment_confirmed_at timestamp,
  cash_on_delivery boolean DEFAULT false,
  confirmed_at timestamp,
  ready_at timestamp,
  picked_up_at timestamp,
  delivered_at timestamp,
  cancelled_at timestamp,
  cancel_reason text,
  zone_id uuid REFERENCES zones(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES product_orders(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES merchant_listings(id),
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  subtotal numeric(10,2) NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_orders_customer ON product_orders (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_orders_business ON product_orders (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_order_items_order ON product_order_items (order_id);
