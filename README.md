# Zemba Marketplace

Escrow-backed marketplace for Zambia (Next.js 14 on Vercel, Supabase Postgres + Storage).

## Set up
1. Supabase SQL Editor: run `db/schema.sql` (first time), then `db/migration-2.sql` (adds password reset, photos, payouts).
2. Vercel -> Settings -> Environment Variables: fill in everything in `.env.example`, then Redeploy.
3. Edit `src/lib/site.ts` with your phone, WhatsApp and email.
4. Make yourself admin with `db/make-admin.sql`.
