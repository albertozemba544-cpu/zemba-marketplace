-- ZEMBA MARKETPLACE - upgrade #2
-- Run this ONCE in Supabase -> SQL Editor BEFORE you upload the new website files.
-- Safe to run again. It does not delete any data.

-- 1) Email verification + password reset links
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
-- everyone who already has an account counts as verified
UPDATE users SET email_verified_at = now() WHERE email_verified_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,                 -- VERIFY_EMAIL | RESET_PASSWORD
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id, type);

-- 2) Several photos per product
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id, position);

-- 3) Track money that still has to be sent by hand (seller payouts and buyer refunds)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_status VARCHAR(10);      -- DUE | PAID
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_reference VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_paid_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status VARCHAR(10);      -- DUE | PAID
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reference VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_paid_at TIMESTAMPTZ;
-- orders that were already finished before this upgrade
UPDATE orders SET payout_status = 'DUE' WHERE status = 'COMPLETED' AND payout_status IS NULL;
UPDATE orders SET refund_status = 'DUE' WHERE status = 'REFUNDED' AND refund_status IS NULL;

-- 4) Keep the new tables private (the website uses the database password, not the public API)
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
