# Zemba Marketplace

A full local-first marketplace — customer storefront, seller backend, admin panel, reviews, suggestions, chatbot, escrow order flow, vendor verification (KYC), dispute messaging, and automated notifications — built on Next.js 14 with SQLite.

## Features

### Customer Experience
- **Browse & Search** — Product search, category filtering, saved items (localStorage persistence)
- **Shopping Cart** — Add/remove items, view cart, instant checkout
- **Product Details** — Seller info, product/seller ratings, one-review-per-customer enforcement
- **Escrow Orders** — Real-time status tracking (PENDING_PAYMENT → FUNDS_SECURED → DISPATCHED → COMPLETED)
- **Order Delivery** — Delivery code confirmation, instant fund release to vendor
- **Dispute Filing** — File disputes on orders with reason explanation
- **Dispute Messaging** — Message thread with seller/admin during disputes (real-time communication)
- **Reviews & Ratings** — Submit and view product + seller ratings separately

### Seller Backend
- **Vendor KYC** — Submit NRC number and location during registration (admin must approve before listing)
- **Create Listings** — Publish products with title, price, stock, category, image uploads
- **Order Dashboard** — View incoming orders with status tracking
- **Shipment Dispatch** — Upload waybill proof for dispatch tracking
- **Quick Links** — Generate shareable social media links for instant checkout (e.g., `/quick-pay/[linkId]`)
- **Notifications** — Receive alerts when funds are secured, order dispatched, or payment released

### Admin Panel
- **Vendor Approvals** — Review seller KYC (NRC, location, business name) before approval
- **Dispute Resolution** — Read full dispute message history, make rulings (refund or release funds)
- **User Management** — Suspend/ban accounts, set newsletter opt-in
- **Order Monitoring** — View all orders, track GMV and platform fee revenue
- **Announcements** — Send weekly newsletters to subscribed users
- **Moderation Tools** — View user activity, approve/reject product listings

### Platform Features
- **Escrow Protection** — 2.5% platform fee, funds held until delivery confirmed
- **Chatbot** — FAQ-based site assistant on every page
- **Feedback System** — Users can submit suggestions/feature requests
- **Offline-First** — SQLite database, local uploads, no remote dependencies while running
- **Mobile Money Ready** — Demo payment flow (ready for Africa's Talking SMS integration)

## Run it locally and offline
```bash
npm install
npm run db:init
npm run dev
```
Visit `http://localhost:3000` (or `localhost:3001`/`3002` if ports are busy). After `npm run build`, use `npm start` for production server.

The storefront is self-contained for local/offline use: it uses SQLite, local uploads in `public/uploads`, local API routes, and CSS-only backgrounds. Internet is not required while the app is running. `npm install` still requires internet the first time unless the npm cache or `node_modules` is already available.

### Demo logins (printed by `npm run db:init`)
| Role | Email | Password |
|---|---|---|
| Customer | customer@zemba.demo | demo1234 |
| Seller | seller@zemba.demo | demo1234 |
| Admin | admin@zemba.demo | demo1234 |

4. **Image storage for production.** Product uploads work locally and are stored in `public/uploads`; production deployments should move those files to durable object storage.

- **Marketplace home** (`/`) — search, category filtering, saved items, cart count, product cards, local seller promotion, and responsive navigation.
- **Login screens** (`/login`, `/seller/login`, `/admin/login`) — same sky engine in `mode="ambient"`, drifting continuously since there's no scroll on a single-viewport login screen. Real login flow: submits to `/api/auth/login`, which checks against the seeded users table and sets a session.
- **Customer storefront**: `/browse` (product grid, add to cart), `/product/[id]` (detail page), `/cart` (view/remove items, checkout), `/checkout` and `/checkout/[reference]` (escrow status per order).
- **Seller backend**: `/seller/dashboard` (listings + orders), `/seller/listings/new` (publish a listing — fully wired, writes to the database).
- **Admin panel**: `/admin/dashboard` (GMV, fee revenue, order table), `/admin/disputes` (resolve as refund-buyer or release-to-seller — fully wired), `/admin/users` (all platform users).
- Cart → checkout → escrow order creation is fully wired (`/api/orders`), including the 2.5% platform fee calculation.
- The mobile money webhook (`/api/webhook/momo`) and delivery-release endpoint (`/api/orders/[reference]/release`) are the same escrow logic from the original blueprint, adapted to the marketplace's multi-seller schema.

## Production-only dependencies

Same real-world dependencies as the escrow scaffold, plus marketplace-specific integrations:

1. **Mobile Money Gateway** — SMS notification triggers via Africa's Talking API
   - Update `.env` with Africa's Talking credentials
   - Uncomment SMS sending code in `/api/notifications`
   - Replace demo transaction IDs with real gateway responses

2. **Hosted Postgres + Redis** — Currently uses local SQLite; `db/schema.sql` is the real Postgres schema for Supabase/Neon

3. **Real authentication** — Current login is demo-only:
   - ❌ Passwords compared plain-text
   - ❌ Session stored in unsigned cookie
   - ✅ bcrypt hashing already imported; requires full implementation
   - Recommendation: NextAuth.js, Lucia, or Clerk

4. **Image storage** — Currently stores in `public/uploads/`:
   - Production: Move to S3, Cloudinary, or Supabase Storage
   - Add CDN for fast delivery

5. **Seller Payout Integration** — Payment release is stubbed with TODO comment:
   - Implement mobile money payout API call in `/api/orders/[reference]/release`
   - Link to seller's MoMo account for fund transfer

6. **Regulatory review** — Bank of Zambia compliance for escrow operations
   - Worth a lawyer review before handling real transactions

## Architecture

- **Frontend**: Next.js 14 with React 18, "use client" components for interactivity
- **Backend**: Next.js API routes (`/api/...`)
- **Database**: SQLite (dev) / Postgres (production)
- **Auth**: Demo mode (localStorage + unsigned cookie) / Production (NextAuth recommended)
- **Styling**: Pure CSS with variables, no Tailwind (offline first)
- **Images**: Emoji placeholders locally, real uploads to `/public/uploads`

## Suggested next step
Get the seller flow (`/seller/login` → `/seller/listings/new`) feeling right first, since customer browsing depends on there being real listings to show.
