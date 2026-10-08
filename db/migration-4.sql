-- ZEMBA MARKETPLACE - upgrade #4 (trust features: ID checks, seller scores, real-buyer reviews, bus/courier shipping)
-- Run this ONCE in Supabase -> SQL Editor BEFORE you upload the new website files.
-- Safe to run again. It does not delete any data.

-- 1) Seller ID checks. The photos live in a PRIVATE bucket; only the server and admins can open them.
ALTER TABLE vendor_verification
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS nrc_photo_path TEXT,
  ADD COLUMN IF NOT EXISTS selfie_path TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('zemba-private', 'zemba-private', false)
ON CONFLICT (id) DO NOTHING;

-- 2) Reviews can only come from real, completed orders
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_review_order ON product_reviews(order_id) WHERE order_id IS NOT NULL;

-- 3) Where the buyer wants the item sent, and how the seller sent it (bus / courier / waybill)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS receiver_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS receiver_phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS delivery_town VARCHAR(80),
  ADD COLUMN IF NOT EXISTS delivery_note VARCHAR(300),
  ADD COLUMN IF NOT EXISTS carrier_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS waybill_number VARCHAR(60),
  ADD COLUMN IF NOT EXISTS pickup_point VARCHAR(200);

CREATE TABLE IF NOT EXISTS carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  kind VARCHAR(20) NOT NULL DEFAULT 'BUS',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 100
);
ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;

-- A starting list. Check it, and edit it any time in Supabase -> Table Editor -> carriers
-- (add a row to add a company, set "active" to false to hide one).
INSERT INTO carriers (name, kind, sort_order) VALUES
  ('Mazhandu Family Bus Services', 'BUS', 10),
  ('Power Tools Bus Services', 'BUS', 20),
  ('Shalom Bus Services', 'BUS', 30),
  ('Juldan Motors', 'BUS', 40),
  ('Zampost', 'POST', 50),
  ('DHL', 'COURIER', 60),
  ('Seller delivered it by hand', 'OTHER', 90)
ON CONFLICT (name) DO NOTHING;

-- 4) WhatsApp updates: only for people who tick the box when they register
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
