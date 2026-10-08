export const dynamic = 'force-dynamic';

// Admin only: downloads a copy of your data as one file (Admin -> "Download backup").
// Password hashes are left out on purpose. This is a safety net, not a full database backup:
// photos are not included, and Supabase's own backups (paid plans) are better when you can afford them.

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleError } from '@/lib/http';

const TABLES: Record<string, string> = {
  users: 'SELECT id, role, full_name, business_name, phone_number, email, momo_provider, momo_number, approval_status, account_status, user_category, newsletter_opt_in, ban_reason, email_verified_at, created_at FROM users',
  vendor_verification: 'SELECT * FROM vendor_verification',
  products: 'SELECT * FROM products',
  product_images: 'SELECT * FROM product_images',
  orders: 'SELECT * FROM orders',
  transaction_events: 'SELECT * FROM transaction_events',
  disputes: 'SELECT * FROM disputes',
  dispute_messages: 'SELECT * FROM dispute_messages',
  order_notifications: 'SELECT * FROM order_notifications',
  product_reviews: 'SELECT * FROM product_reviews',
  quick_links: 'SELECT * FROM quick_links',
  suggestions: 'SELECT * FROM suggestions',
  announcements: 'SELECT * FROM announcements',
};

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const backup: Record<string, unknown> = { created_at: new Date().toISOString() };
    for (const [name, sql] of Object.entries(TABLES)) {
      backup[name] = await query(`${sql} LIMIT 50000`);
    }
    return new NextResponse(JSON.stringify(backup), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="zemba-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleError(error, 'Could not create the backup');
  }
}
