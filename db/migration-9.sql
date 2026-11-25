-- ZEMBA MARKETPLACE - upgrade #9 (hold limit, automatic release, warnings, payment provider preparation)
-- Run this ONCE in Supabase -> SQL Editor BEFORE you upload the new website files.
-- Safe to run again. It does not delete any data.

-- When the order was paid, and when the seller dispatched it
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;

-- The moment the money is released to the seller by itself if the buyer has not confirmed or opened a dispute.
-- It can never be later than 14 days after payment.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMPTZ;

-- How many "your payment will be released soon" warnings the buyer has had (0, 1 or 2)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS release_warnings_sent INTEGER NOT NULL DEFAULT 0;

-- How the money was released: BUYER_CODE | AUTO_RELEASE | DISPUTE | ADMIN
ALTER TABLE orders ADD COLUMN IF NOT EXISTS release_method VARCHAR(20);

-- When a payout or refund became due (used for the "should be sent within 24 hours" timer)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_due_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_due_at TIMESTAMPTZ;

-- Ready for a payment provider: the provider's own reference numbers and any error it returned.
-- payout_status and refund_status can now also be PROCESSING or FAILED (besides DUE and PAID).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(30);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_provider_ref VARCHAR(120);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_provider_ref VARCHAR(120);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_error TEXT;

-- Fill in the new dates for orders that already exist
UPDATE orders o SET paid_at = e.at
  FROM (SELECT order_id, MIN(created_at) AS at FROM transaction_events WHERE event_type = 'PAYMENT_SECURED' GROUP BY order_id) e
  WHERE e.order_id = o.id AND o.paid_at IS NULL;
UPDATE orders o SET dispatched_at = e.at
  FROM (SELECT order_id, MIN(created_at) AS at FROM transaction_events WHERE event_type = 'DISPATCHED' GROUP BY order_id) e
  WHERE e.order_id = o.id AND o.dispatched_at IS NULL;
-- Orders that are on their way right now get a fresh 3-day review period starting from this moment
UPDATE orders SET auto_release_at = now() + interval '3 days' WHERE status = 'DISPATCHED' AND auto_release_at IS NULL;
UPDATE orders SET payout_due_at = updated_at WHERE payout_status = 'DUE' AND payout_due_at IS NULL;
UPDATE orders SET refund_due_at = updated_at WHERE refund_status = 'DUE' AND refund_due_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_auto_release ON orders(auto_release_at) WHERE status = 'DISPATCHED';
