export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { createNotification, NOTIFICATION_TYPES } from '@/lib/orders';
import { fail, handleError, isUuid } from '@/lib/http';

// GET /api/notifications?order_id=...  (buyer, seller of that order, or admin)
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ('res' in auth) return auth.res;
  try {
    const orderId = req.nextUrl.searchParams.get('order_id');
    const type = req.nextUrl.searchParams.get('type');
    if (!isUuid(orderId)) return fail('order_id is required');

    const order = await queryOne<{ customer_id: string; seller_id: string }>(
      'SELECT customer_id, seller_id FROM orders WHERE id = $1',
      [orderId]
    );
    const { user } = auth;
    if (!order || (user.role !== 'admin' && order.customer_id !== user.id && order.seller_id !== user.id)) {
      return fail('Order not found', 404);
    }

    const rows = type
      ? await query('SELECT * FROM order_notifications WHERE order_id = $1 AND notification_type = $2 ORDER BY sent_at DESC', [orderId, type])
      : await query('SELECT * FROM order_notifications WHERE order_id = $1 ORDER BY sent_at DESC', [orderId]);
    return NextResponse.json(rows);
  } catch (error) {
    return handleError(error, 'Unable to fetch notifications');
  }
}

// POST is admin-only. The order routes create notifications directly on the server.
export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const { order_id, recipient_id, notification_type } = await req.json();
    if (!isUuid(order_id) || !isUuid(recipient_id) || !notification_type) {
      return fail('order_id, recipient_id, and notification_type are required');
    }
    if (!NOTIFICATION_TYPES.includes(notification_type)) return fail('Invalid notification type');

    const created = await createNotification(order_id, recipient_id, notification_type);
    if (!created) return NextResponse.json({ message: 'Notification already sent or order not found' });
    return NextResponse.json({ notification_id: created.id, message: created.message, type: notification_type }, { status: 201 });
  } catch (error) {
    return handleError(error, 'Unable to send notification');
  }
}
