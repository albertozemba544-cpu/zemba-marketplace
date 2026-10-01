export const dynamic = 'force-dynamic';

// Buyer-side dispute endpoints. Disputes are stored in the "disputes" table,
// which is the same table the admin dashboard resolves.

import { NextRequest, NextResponse } from 'next/server';
import { logEvent, query, queryOne, withTransaction } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, handleError } from '@/lib/http';

const DISPUTABLE = ['FUNDS_SECURED', 'DISPATCHED', 'PENDING_ADMIN_REVIEW'];

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['customer']);
  if ('res' in auth) return auth.res;
  try {
    const { order_id, reason } = await req.json();
    const text = String(reason || '').trim();
    if (!order_id || !text) return fail('order_id and reason are required');

    const order = await queryOne<any>(
      'SELECT id, status FROM orders WHERE (id::text = $1 OR order_reference = $1) AND customer_id = $2',
      [String(order_id), auth.user.id]
    );
    if (!order) return fail('Order not found', 404);
    if (!DISPUTABLE.includes(order.status)) return fail('This order cannot be disputed in its current state', 409);

    const open = await queryOne('SELECT id FROM disputes WHERE order_id = $1 AND status = $2', [order.id, 'OPEN']);
    if (open) return fail('A dispute is already open for this order', 409);

    const disputeId = await withTransaction(async (client) => {
      const inserted = await client.query(
        'INSERT INTO disputes (order_id, raised_by, reason) VALUES ($1, $2, $3) RETURNING id',
        [order.id, auth.user.id, text.slice(0, 2000)]
      );
      await client.query("UPDATE orders SET status = 'DISPUTED', updated_at = now() WHERE id = $1", [order.id]);
      await logEvent(order.id, 'BUYER_DISPUTE_OPENED', { dispute_id: inserted.rows[0].id, reason: text }, client);
      return inserted.rows[0].id as string;
    });
    return NextResponse.json({ dispute_id: disputeId, ok: true }, { status: 201 });
  } catch (error) {
    return handleError(error, 'Unable to create dispute');
  }
}

// GET /api/orders/disputes?order_id=<order id or order reference>
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ('res' in auth) return auth.res;
  try {
    const orderKey = req.nextUrl.searchParams.get('order_id');
    if (!orderKey) return fail('order_id is required');

    const order = await queryOne<any>('SELECT id, customer_id, seller_id FROM orders WHERE id::text = $1 OR order_reference = $1', [orderKey]);
    const { user } = auth;
    if (!order || (user.role !== 'admin' && order.customer_id !== user.id && order.seller_id !== user.id)) {
      return NextResponse.json(null);
    }

    const dispute = await queryOne<any>('SELECT * FROM disputes WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1', [order.id]);
    if (!dispute) return NextResponse.json(null);

    const messages = await query(
      `SELECT m.id, m.sender_id, m.message, m.created_at, u.role AS sender_role
       FROM dispute_messages m JOIN users u ON u.id = m.sender_id
       WHERE m.dispute_id = $1 ORDER BY m.created_at ASC`,
      [dispute.id]
    );
    return NextResponse.json({ ...dispute, messages });
  } catch (error) {
    return handleError(error, 'Unable to fetch dispute');
  }
}
