# Zemba Marketplace

An online marketplace for Zambia where buyers pay safely (escrow) and sellers ship by bus or courier.
Built with Next.js 14, hosted on Vercel, with Supabase (database and photos) and Brevo (email).

## Setting up a NEW project
1. Supabase -> SQL Editor -> paste all of `db/full-schema.sql` -> Run. (It contains every table. Do not run the other `.sql` files.)
2. Vercel -> Settings -> Environment Variables: add everything listed in `.env.example`, then Redeploy.
3. Edit `src/lib/site.ts` with your phone, WhatsApp, email and company details.
4. Register on the site, then make yourself admin with `db/make-admin.sql`.

## Updating a project that is already running
Run only the newest `db/migration-N.sql` files you have not run yet, then upload the new files.

## Where things are
- `src/lib/site.ts` - your company and contact details (change them here only)
- `src/lib/moderation.ts` - the rules that automatically hide suspicious listings
- Admin: log in at `/admin/login`. The "Today" page shows what needs you.
