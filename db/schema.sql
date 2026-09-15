-- ZEMBA MARKETPLACE — full schema (PostgreSQL)
-- Extends the original escrow schema with products, cart, and disputes
-- so one platform covers customer, seller and admin roles.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Single users table, distinguished by role. A seller and an admin are both
-- "users" with extra fields relevant to their role.
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(20) NOT NULL, -- 'customer' | 'seller' | 'admin'
  full_name VARCHAR(255) NOT NULL,
  business_name VARCHAR(255), -- sellers only
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  momo_provider VARCHAR(50), -- sellers only: 'MTN' or 'AIRTEL'
  momo_number VARCHAR(20),   -- sellers only
  approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, BANNED
  user_category VARCHAR(30) NOT NULL DEFAULT 'CUSTOMER',
  newsletter_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  ban_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  login_status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(12, 2) NOT NULL,
  category VARCHAR(100),
  stock INTEGER DEFAULT 1,
  image_url TEXT,
  approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, PAUSED, REMOVED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
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
  -- PENDING_PAYMENT, FUNDS_SECURED, DISPATCHED, COMPLETED, REFUNDED, DISPUTED
  gateway_transaction_id VARCHAR(255),
  delivery_code VARCHAR(10),
  waybill_image_url TEXT,
  timeout_days INTEGER NOT NULL DEFAULT 3,
  timeout_warning_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  raised_by UUID REFERENCES users(id),
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, RESOLVED_REFUND, RESOLVED_RELEASE
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  audience VARCHAR(30) NOT NULL DEFAULT 'ALL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_disputes_status ON disputes(status);
