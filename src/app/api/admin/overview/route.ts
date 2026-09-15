import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const users = db.prepare(`
    SELECT users.id, users.role, users.full_name, users.business_name, users.email, users.phone_number, users.approval_status, users.account_status, users.user_category, users.newsletter_opt_in, users.ban_reason, users.created_at, 
           vendor_verification.nrc_number, vendor_verification.location
    FROM users 
    LEFT JOIN vendor_verification ON users.id = vendor_verification.user_id
    ORDER BY users.created_at DESC
  `).all();
  const products = db.prepare(`
    SELECT products.*, users.business_name, users.full_name as seller_name
    FROM products JOIN users ON users.id = products.seller_id ORDER BY products.created_at DESC
  `).all();
  const orders = db.prepare(`
    SELECT orders.*, products.title, users.business_name, users.full_name as seller_name
    FROM orders LEFT JOIN products ON products.id = orders.product_id
    LEFT JOIN users ON users.id = orders.seller_id ORDER BY orders.created_at DESC LIMIT 200
  `).all();
  const disputes = db.prepare(`
    SELECT disputes.*, orders.order_reference, orders.status as order_status
    FROM disputes JOIN orders ON orders.id = disputes.order_id ORDER BY disputes.created_at DESC
  `).all();
  const events = db.prepare(`
    SELECT transaction_events.*, orders.order_reference
    FROM transaction_events JOIN orders ON orders.id = transaction_events.order_id
    ORDER BY transaction_events.created_at DESC LIMIT 100
  `).all();
  const announcements = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 50').all();
  const newsletterSubscribers = db.prepare("SELECT COUNT(*) as count FROM users WHERE newsletter_opt_in = 1 AND account_status = 'ACTIVE'").get() as { count: number };
  return NextResponse.json({ users, products, orders, disputes, events, announcements, newsletterSubscribers: newsletterSubscribers.count });
}