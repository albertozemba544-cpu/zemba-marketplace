-- ZEMBA MARKETPLACE - COMPLETE DATABASE SETUP (everything in one file)
--
-- Use this file when you set up a NEW Supabase project (or rebuild one).
-- Paste ALL of it into Supabase -> SQL Editor -> New query -> Run. It is safe to run again.
-- It already contains schema.sql and migration-2 to migration-6, so you do NOT run those separately.
-- (If your database is already running, you do not need this file.)
--
-- Note: this combined file has been checked for mistakes by reading it, but it has not been run on a
-- brand-new project yet. The first time you use it, try it on a spare, empty Supabase project.

-- ================================================================
-- from schema.sql
-- ================================================================
-- ZEMBA MARKETPLACE - complete schema for Supabase (PostgreSQL)
-- Paste this whole file into Supabase -> SQL Editor -> New query -> Run.
-- It is safe to run more than once, and it also upgrades tables you already created.

-- ---------- core tables ----------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(20) NOT NULL,                     -- customer | seller | admin
  full_name VARCHAR(255) NOT NULL,
  business_name VARCHAR(255),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  momo_provider VARCHAR(50),
  momo_number VARCHAR(20),
  approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',   -- PENDING | APPROVED | REJECTED
  account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',     -- ACTIVE | SUSPENDED | BANNED
  user_category VARCHAR(30) NOT NULL DEFAULT 'CUSTOMER',
  newsletter_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  ban_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  login_status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(12, 2) NOT NULL,
  category VARCHAR(100),
  stock INTEGER DEFAULT 1,
  image_url TEXT,
  approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',   -- PENDING | APPROVED | REJECTED
  status VARCHAR(20) DEFAULT 'ACTIVE',                      -- ACTIVE | PAUSED | REMOVED | LINK_ONLY
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_reference VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  amount DECIMAL(12, 2) NOT NULL,
  platform_fee DECIMAL(12, 2) NOT NULL,
  net_amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(30) DEFAULT 'PENDING_PAYMENT',
  -- PENDING_PAYMENT | FUNDS_SECURED | DISPATCHED | PENDING_ADMIN_REVIEW | COMPLETED | REFUNDED | DISPUTED
  gateway_transaction_id VARCHAR(255),
  delivery_code VARCHAR(10),
  waybill_image_url TEXT,
  timeout_days INTEGER NOT NULL DEFAULT 3,
  timeout_warning_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  raised_by UUID REFERENCES users(id),
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'OPEN',                        -- OPEN | RESOLVED_REFUND | RESOLVED_RELEASE
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  audience VARCHAR(30) NOT NULL DEFAULT 'ALL',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ---------- tables the website needs that the old schema was missing ----------
CREATE TABLE IF NOT EXISTS vendor_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  nrc_number VARCHAR(50),
  location VARCHAR(100),
  business_registration VARCHAR(100),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_rating INTEGER NOT NULL CHECK (product_rating BETWEEN 1 AND 5),
  seller_rating INTEGER NOT NULL CHECK (seller_rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (product_id, user_id)
);

CREATE TABLE IF NOT EXISTS suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'NEW',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quick_links (
  id TEXT PRIMARY KEY,                                      -- short code such as 3F9A12BC
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (order_id, recipient_id, notification_type)
);

-- ---------- indexes ----------
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute ON dispute_messages(dispute_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_customer_product ON cart_items(customer_id, product_id);

-- ---------- security ----------
-- Lock every table so nobody can read it through Supabase's public REST API
-- (password hashes live in "users"). The website itself connects with the
-- database password, which is not affected by this.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_notifications ENABLE ROW LEVEL SECURITY;

-- ---------- image storage ----------
-- Public bucket for product photos and dispatch proof. Uploads happen on the
-- server with the service role key.
INSERT INTO storage.buckets (id, name, public)
VALUES ('zemba-uploads', 'zemba-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- from migration-2.sql
-- ================================================================
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

-- ================================================================
-- from migration-3.sql
-- ================================================================
-- ZEMBA MARKETPLACE - upgrade #3 (legal pages)
-- Run this ONCE in Supabase -> SQL Editor BEFORE you upload the new website files.
-- Safe to run again. It does not delete any data.

-- Records when each person accepted the Terms, Privacy Policy and Refund Policy
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- ================================================================
-- from migration-4.sql
-- ================================================================
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

-- ================================================================
-- from migration-5.sql
-- ================================================================
-- ZEMBA MARKETPLACE - upgrade #5 (safety: attempt limits, and a note for manual seller verification)
-- Run this ONCE in Supabase -> SQL Editor BEFORE you upload the new website files.
-- Safe to run again. It does not delete any data.

-- Counts attempts (logins, sign-ups, messages) so nobody can guess passwords or flood the site
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  bucket TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (key, bucket)
);
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- How a seller was verified (for example: "checked ID on a WhatsApp video call on 12 Nov")
ALTER TABLE vendor_verification ADD COLUMN IF NOT EXISTS verification_note TEXT;

-- ================================================================
-- from migration-6.sql
-- ================================================================
-- ZEMBA MARKETPLACE - upgrade #6
-- (automatic publishing with flags, reports, buyer-seller dispute agreements, admin hold / pause, email tools)
-- Run this ONCE in Supabase -> SQL Editor BEFORE you upload the new website files.
-- Safe to run again. It does not delete any data.

-- 1) Listings and sellers go live automatically. Anything suspicious is FLAGGED (hidden) for the admin.
ALTER TABLE products ADD COLUMN IF NOT EXISTS flag_reason TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS flag_reason TEXT;
-- Anything still waiting for approval under the old rules is approved now
UPDATE products SET approval_status = 'APPROVED' WHERE approval_status = 'PENDING';
UPDATE users SET approval_status = 'APPROVED' WHERE role = 'seller' AND approval_status = 'PENDING';

-- 2) Reports ("Report this listing" / "Report this user")
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_type VARCHAR(10) NOT NULL,            -- USER | PRODUCT
  target_id UUID NOT NULL,
  reason VARCHAR(40) NOT NULL,
  details TEXT,
  status VARCHAR(12) NOT NULL DEFAULT 'OPEN',  -- OPEN | ACTIONED | DISMISSED
  handled_by UUID REFERENCES users(id),
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_report_once ON reports(reporter_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id, status);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 3) Disputes: buyer and seller try to agree first; the admin is only the last step
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS stage VARCHAR(30) NOT NULL DEFAULT 'NEGOTIATING';
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS resolved_by VARCHAR(20);          -- AGREEMENT | ADMIN
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS return_carrier VARCHAR(100);
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS return_waybill VARCHAR(60);
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS return_sent_at TIMESTAMPTZ;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS return_received_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS dispute_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES users(id),
  kind VARCHAR(20) NOT NULL,                  -- REFUND | RELEASE | RETURN
  note TEXT,
  status VARCHAR(12) NOT NULL DEFAULT 'PENDING',  -- PENDING | ACCEPTED | DECLINED | SUPERSEDED
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_proposals_dispute ON dispute_proposals(dispute_id);
ALTER TABLE dispute_proposals ENABLE ROW LEVEL SECURITY;

-- 4) Admin brakes: put one order on hold, or pause all money movement
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_hold BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS hold_reason TEXT;

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO site_settings (key, value) VALUES ('payments_paused', 'false') ON CONFLICT (key) DO NOTHING;

-- 5) Email tools: updates to many people, and messages to one person
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind VARCHAR(10) NOT NULL,                  -- NEWS (people who opted in) | SERVICE (important update, everyone)
  audience VARCHAR(10) NOT NULL DEFAULT 'ALL', -- ALL | BUYERS | SELLERS
  subject VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  button_text VARCHAR(60),
  button_url TEXT,
  total INTEGER NOT NULL DEFAULT 0,
  sent INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(10) NOT NULL DEFAULT 'SENDING',  -- SENDING | DONE
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS broadcast_recipients (
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  status VARCHAR(10) NOT NULL DEFAULT 'PENDING',  -- PENDING | SENT | FAILED
  error TEXT,
  sent_at TIMESTAMPTZ,
  PRIMARY KEY (broadcast_id, user_id)
);
CREATE TABLE IF NOT EXISTS admin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_email VARCHAR(255),
  subject VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  delivered BOOLEAN NOT NULL DEFAULT FALSE,
  sent_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;
