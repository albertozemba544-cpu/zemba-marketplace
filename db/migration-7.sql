-- ZEMBA MARKETPLACE - upgrade #7 (shipping fees chosen by the seller)
-- Run this ONCE in Supabase -> SQL Editor BEFORE you upload the new website files.
-- Safe to run again. It does not delete any data. Existing listings stay on free shipping.

-- How a listing charges for delivery:
--   FREE     = shipping is included in the price, delivered anywhere the seller sends to
--   BY_TOWN  = the seller sets a shipping price per town (and optionally one price for all other towns)
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_mode VARCHAR(10) NOT NULL DEFAULT 'FREE';
-- price for towns that are not in the seller's list. NULL = the seller does not deliver to other towns.
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_other_price DECIMAL(12, 2);

CREATE TABLE IF NOT EXISTS product_shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  town VARCHAR(80) NOT NULL,
  price DECIMAL(12, 2) NOT NULL DEFAULT 0,       -- 0 = free shipping to this town
  UNIQUE (product_id, town)
);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_product ON product_shipping_rates(product_id);
ALTER TABLE product_shipping_rates ENABLE ROW LEVEL SECURITY;

-- The shipping the buyer paid on each order (it is paid out to the seller together with the item)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_amount DECIMAL(12, 2) NOT NULL DEFAULT 0;
