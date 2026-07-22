-- Food vertical: restaurants, menus, food orders (idempotent)

DO $$ BEGIN
  CREATE TYPE food_order_status AS ENUM (
    'PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP',
    'PICKED_UP', 'DELIVERED', 'CANCELLED', 'REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE restaurant_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_fr text,
  slug text UNIQUE,
  description text,
  description_fr text,
  cuisine_types jsonb DEFAULT '[]',
  logo_url text,
  cover_url text,
  address text NOT NULL,
  city text NOT NULL,
  country text DEFAULT 'TG',
  lat numeric(10,7),
  lng numeric(10,7),
  phone text,
  whatsapp text,
  opening_hours jsonb DEFAULT '{}',
  average_delivery_mins integer DEFAULT 35,
  minimum_order_amount numeric(10,2) DEFAULT 0.00,
  delivery_fee_override numeric(8,2),
  commission_rate numeric(4,2) DEFAULT 20.00,
  rating numeric(3,2) DEFAULT 0.00,
  rating_count integer DEFAULT 0,
  total_orders integer DEFAULT 0,
  is_online boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  status restaurant_status DEFAULT 'PENDING',
  zone_id uuid REFERENCES zones(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS restaurant_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_fr text,
  description text,
  description_fr text,
  category text,
  price numeric(10,2) NOT NULL,
  currency text DEFAULT 'XOF',
  image_url text,
  is_available boolean DEFAULT true,
  is_popular boolean DEFAULT false,
  preparation_mins integer DEFAULT 15,
  allergens jsonb DEFAULT '[]',
  sort_order integer DEFAULT 0,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS food_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  customer_id uuid NOT NULL REFERENCES users(id),
  driver_id uuid REFERENCES drivers(id),
  tracking_token text UNIQUE NOT NULL,
  status food_order_status DEFAULT 'PENDING',
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
  estimated_pickup_at timestamp,
  estimated_delivery_at timestamp,
  confirmed_at timestamp,
  prepared_at timestamp,
  picked_up_at timestamp,
  delivered_at timestamp,
  cancelled_at timestamp,
  cancel_reason text,
  zone_id uuid REFERENCES zones(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS food_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES food_orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES restaurant_menu_items(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  subtotal numeric(10,2) NOT NULL,
  special_instructions text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_orders_customer ON food_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_food_orders_restaurant ON food_orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON restaurant_menu_items(restaurant_id);
