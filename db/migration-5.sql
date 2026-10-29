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
