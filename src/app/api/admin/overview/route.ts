export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleError } from '@/lib/http';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const [users, products, orders, disputes, events, announcements, subscribers] = await Promise.all([
      query(`
        SELECT u.id, u.role, u.full_name, u.business_name, u.email, u.phone_number, u.approval_status,
               u.account_status, u.user_category, u.newsletter_opt_in, u.ban_reason, u.created_at,
               v.nrc_number, v.location
        FROM users u LEFT JOIN vendor_verification v ON u.id = v.user_id
        ORDER BY u.created_at DESC`),
      query(`
        SELECT p.*, u.business_name, u.full_name AS seller_name
        FROM products p JOIN users u ON u.id = p.seller_id
        ORDER BY p.created_at DESC`),
      query(`
        SELECT o.id, o.order_reference, o.customer_id, o.seller_id, o.product_id, o.quantity, o.amount,
               o.platform_fee, o.net_amount, o.status, o.waybill_image_url, o.timeout_days, o.created_at,
               p.title, u.business_name, u.full_name AS seller_name
        FROM orders o
        LEFT JOIN products p ON p.id = o.product_id
        LEFT JOIN users u ON u.id = o.seller_id
        ORDER BY o.created_at DESC LIMIT 200`),
      query(`
        SELECT d.*, o.order_reference, o.status AS order_status
        FROM disputes d JOIN orders o ON o.id = d.order_id
        ORDER BY d.created_at DESC`),
      query(`
        SELECT e.*, o.order_reference
        FROM transaction_events e JOIN orders o ON o.id = e.order_id
        ORDER BY e.created_at DESC LIMIT 100`),
      query('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 50'),
      queryOne<{ count: number }>(
        "SELECT COUNT(*) AS count FROM users WHERE newsletter_opt_in = true AND account_status = 'ACTIVE'"
      ),
    ]);

    return NextResponse.json({
      users,
      products,
      orders,
      disputes,
      events,
      announcements,
      newsletterSubscribers: subscribers?.count ?? 0,
    });
  } catch (error) {
    return handleError(error);
  }
}
