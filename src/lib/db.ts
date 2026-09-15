// Local dev: SQLite. Production: swap internals for a `pg` Pool against
// Supabase/Neon and keep these exported function names so pages/routes
// don't need to change.

import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

const dbPath = path.join(process.cwd(), 'zemba.dev.sqlite');
export const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS product_reviews (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    product_rating INTEGER NOT NULL CHECK (product_rating BETWEEN 1 AND 5),
    seller_rating INTEGER NOT NULL CHECK (seller_rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS suggestions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'NEW',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS quick_links (
    id TEXT PRIMARY KEY,
    seller_id TEXT NOT NULL,
    product_id TEXT,
    title TEXT NOT NULL,
    price REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS vendor_verification (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    nrc_number TEXT,
    location TEXT,
    business_registration TEXT,
    verified_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS order_disputes (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    buyer_id TEXT,
    seller_id TEXT,
    reason TEXT,
    status TEXT DEFAULT 'OPEN',
    admin_decision TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS dispute_messages (
    id TEXT PRIMARY KEY,
    dispute_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS order_notifications (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    recipient_id TEXT,
    notification_type TEXT,
    sent_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

export const PLATFORM_FEE_RATE = 0.025;

export function computeFees(amount: number) {
  const platform_fee = Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;
  const net_amount = Math.round((amount - platform_fee) * 100) / 100;
  return { platform_fee, net_amount };
}

export interface User {
  id: string;
  role: 'customer' | 'seller' | 'admin';
  full_name: string;
  business_name: string | null;
  phone_number: string;
  email: string;
  password_hash: string;
  momo_provider: string | null;
  momo_number: string | null;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  account_status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  user_category: string;
  newsletter_opt_in: number;
  ban_reason: string | null;
}

export function findUserByEmail(email: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
}

export function findUserById(id: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function listAllUsers(): User[] {
  return db.prepare('SELECT id, role, full_name, business_name, phone_number, email, approval_status, account_status, user_category, newsletter_opt_in, ban_reason, created_at FROM users ORDER BY role, full_name').all() as User[];
}

export function getOrderByReference(reference: string) {
  return db.prepare('SELECT * FROM orders WHERE order_reference = ?').get(reference) as any;
}

export function logEvent(orderId: string, eventType: string, payload: unknown) {
  db.prepare(
    `INSERT INTO transaction_events (id, order_id, event_type, payload) VALUES (?, ?, ?, ?)`
  ).run(randomUUID(), orderId, eventType, JSON.stringify(payload));
}
