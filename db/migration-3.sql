-- ZEMBA MARKETPLACE - upgrade #3 (legal pages)
-- Run this ONCE in Supabase -> SQL Editor BEFORE you upload the new website files.
-- Safe to run again. It does not delete any data.

-- Records when each person accepted the Terms, Privacy Policy and Refund Policy
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
