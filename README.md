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

## Shipping
Sellers choose free shipping or a shipping price per town when they list an item (`src/components/ShippingEditor.tsx`, `src/lib/shipping.ts`). The buyer pays item, shipping and the buyer protection fee in one payment, and the shipping goes to the seller with the payout. It needs `db/migration-7.sql`, run once in Supabase before deploying.

## Messages and alerts
Buyers and sellers chat on the website (`src/components/MessagesPanel.tsx`, `/messages`, `/api/messages`). Zemba passes each message on by email, and by WhatsApp (through your n8n webhook, `NOTIFY_WEBHOOK_URL`) for people who ticked the WhatsApp box. Phone numbers, emails and links are hidden. It needs `db/migration-8.sql`, run once in Supabase before deploying. The order alerts (paid order, dispatch with the courier receipt number, delivery, payout, refund) are in `src/lib/orders.ts`.

## Holding rules, automatic release and warnings
`src/lib/holding.ts` and `src/workers/escrowTimeout.ts` (run daily from `vercel.json`): 3 days to dispatch, a delivery window of at most 8 days, then 3 days for the buyer to check, then the money is released to the seller automatically. Never more than 14 days after payment (an open dispute is the only exception). The buyer is warned 2 days and 1 day before. It needs `db/migration-9.sql`.

## Connecting a payment provider
Everything is prepared in `src/lib/payments`. When an agreement is signed: put the keys in Vercel (see `.env.example`), fill in the five functions in `src/lib/payments/providers/lipila.ts` or `lenco.ts`, set the webhook address in the provider dashboard, test in a Preview with a test database, then set `PAYMENTS_LIVE=true` and (optionally) `AUTO_PAYOUTS=true`. The admin Controls page shows what is set up.

## Fees and order rules
All fee rules live in `src/lib/site.ts` (seller commission, buyer protection fee, cancellation fee, minimum order) and `src/lib/fees.ts` does the maths. The checkout, order pages, legal pages, help pages and admin figures all read from them, so change a number in `site.ts` only.

## Install as an app
The website installs on phones from the browser (`src/app/manifest.ts`, `public/sw.js`, `src/components/PwaSetup.tsx`). No app store is needed.

## Where things are
- `src/lib/site.ts` - your company and contact details (change them here only)
- `src/lib/moderation.ts` - the rules that automatically hide suspicious listings
- Admin: log in at `/admin/login`. The "Today" page shows what needs you.
