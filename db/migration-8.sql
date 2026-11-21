-- ZEMBA MARKETPLACE - upgrade #8 (messages between buyers and sellers, passed on by Zemba)
-- Run this ONCE in Supabase -> SQL Editor BEFORE you upload the new website files.
-- Safe to run again. It does not delete any data.

-- One row per message. A conversation is either about an ORDER, or a question about a PRODUCT before buying.
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  notified_at TIMESTAMPTZ,            -- when the other person was told by email / WhatsApp
  read_at TIMESTAMPTZ,                -- when the other person opened it
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (order_id IS NOT NULL OR product_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_messages_order ON messages(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_product ON messages(product_id, buyer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_buyer ON messages(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_seller ON messages(seller_id, created_at DESC);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
