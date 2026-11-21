export const dynamic = 'force-dynamic';

// The list of conversations for the signed-in buyer or seller, newest first.

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleError } from '@/lib/http';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['customer', 'seller']);
  if ('res' in auth) return auth.res;
  try {
    const rows = await query(
      `WITH mine AS (
         SELECT m.*, COALESCE(m.order_id::text, m.product_id::text || ':' || m.buyer_id::text) AS thread_key
         FROM messages m WHERE m.buyer_id = $1 OR m.seller_id = $1
       )
       SELECT DISTINCT ON (thread_key) thread_key, order_id, product_id, buyer_id, seller_id, sender_id, body, created_at,
         (SELECT COUNT(*) FROM messages x
           WHERE ((x.order_id IS NOT NULL AND x.order_id = mine.order_id) OR (x.order_id IS NULL AND x.product_id = mine.product_id AND x.buyer_id = mine.buyer_id))
             AND x.sender_id <> $1 AND x.read_at IS NULL) AS unread,
         (SELECT order_reference FROM orders WHERE id = mine.order_id) AS reference,
         COALESCE((SELECT title FROM products WHERE id = COALESCE(mine.product_id, (SELECT product_id FROM orders WHERE id = mine.order_id))), 'Order') AS title,
         (SELECT CASE WHEN u.role = 'customer' THEN split_part(u.full_name, ' ', 1) ELSE COALESCE(u.business_name, u.full_name) END
            FROM users u WHERE u.id = CASE WHEN mine.buyer_id = $1 THEN mine.seller_id ELSE mine.buyer_id END) AS other_name
       FROM mine ORDER BY thread_key, created_at DESC`,
      [auth.user.id]
    );
    const threads = rows
      .map((r: any) => ({
        key: r.thread_key, reference: r.reference, product_id: r.product_id, buyer_id: r.buyer_id, title: r.title, other_name: r.other_name,
        last_body: r.body, last_at: r.created_at, last_mine: r.sender_id === auth.user.id, unread: Number(r.unread),
      }))
      .sort((a: any, b: any) => +new Date(b.last_at) - +new Date(a.last_at));
    return NextResponse.json({ threads, unread: threads.reduce((sum: number, t: any) => sum + t.unread, 0) });
  } catch (error) {
    return handleError(error);
  }
}
