export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, handleError, isUuid } from '@/lib/http';

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ('res' in auth) return auth.res;
  try {
    const { dispute_id, message } = await req.json();
    const text = String(message || '').trim();
    if (!isUuid(dispute_id) || !text) return fail('dispute_id and message are required');

    const dispute = await queryOne<any>(
      `SELECT d.id, d.status, o.customer_id, o.seller_id
       FROM disputes d JOIN orders o ON o.id = d.order_id WHERE d.id = $1`,
      [dispute_id]
    );
    const { user } = auth;
    if (!dispute || (user.role !== 'admin' && dispute.customer_id !== user.id && dispute.seller_id !== user.id)) {
      return fail('Dispute not found', 404);
    }
    if (dispute.status !== 'OPEN') return fail('This dispute is closed', 409);

    const saved = await queryOne<{ id: string }>(
      'INSERT INTO dispute_messages (dispute_id, sender_id, message) VALUES ($1, $2, $3) RETURNING id',
      [dispute_id, user.id, text.slice(0, 1000)]
    );
    return NextResponse.json({ msg_id: saved?.id }, { status: 201 });
  } catch (error) {
    return handleError(error, 'Unable to post message');
  }
}
