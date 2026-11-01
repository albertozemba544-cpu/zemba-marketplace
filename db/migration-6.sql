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
