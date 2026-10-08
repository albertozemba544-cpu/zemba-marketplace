-- HOW TO CREATE YOUR ADMIN ACCOUNT
-- 1. On your live website go to /register and create a normal BUYER account with your own email.
-- 2. Paste this into Supabase -> SQL Editor, put your email in, and Run:

UPDATE users
SET role = 'admin',
    approval_status = 'APPROVED',
    account_status = 'ACTIVE',
    user_category = 'ADMIN'
WHERE lower(email) = lower('PUT-YOUR-EMAIL-HERE');

-- 3. Log in at /admin/login with that email and password.
