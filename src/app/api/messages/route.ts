export const dynamic = 'force-dynamic';

// Read a conversation (GET) or send a message in it (POST). Zemba passes the message on to the other person.

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, handleError } from '@/lib/http';
import { allow, TOO_MANY } from '@/lib/ratelimit';
import { MAX_MESSAGE_LENGTH, hideContactDetails, relayMessage } from '@/lib/messages';
import { resolveThread } from '@/lib/messageThreads';

const THREAD_WHERE = `((m.order_id IS NOT NULL AND m.order_id = $1) OR (m.order_id IS NULL AND m.product_id = $2 AND m.buyer_id = $3))`;

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['customer', 'seller', 'admin']);
  if ('res' in auth) return auth.res;
  try {
    const url = new URL(req.url);
    const found = await resolveThread(auth.user, { order: url.searchParams.get('order'), product: url.searchParams.get('product'), buyer: url.searchParams.get('buyer') });
    if ('error' in found) return fail(found.error, found.status);
    const { thread, readOnly } = found;

    const rows = await query(
      `SELECT m.id, m.sender_id, m.body, m.created_at FROM messages m WHERE ${THREAD_WHERE} ORDER BY m.created_at ASC LIMIT 300`,
      [thread.orderId, thread.productId, thread.buyerId]
    );
    if (!readOnly) {
      await query(`UPDATE messages m SET read_at = now() WHERE ${THREAD_WHERE} AND m.sender_id <> $4 AND m.read_at IS NULL`, [thread.orderId, thread.productId, thread.buyerId, auth.user.id]);
    }
    const otherId = auth.user.id === thread.buyerId ? thread.sellerId : thread.buyerId;
    const other = await queryOne<{ name: string; role: string }>('SELECT COALESCE(business_name, full_name) AS name, role FROM users WHERE id = $1', [otherId]);
    const otherName = other ? (other.role === 'customer' ? other.name.split(' ')[0] : other.name) : 'the other person';
    return NextResponse.json({
      title: thread.title, reference: thread.reference, read_only: readOnly, other_name: otherName,
      messages: rows.map((m: any) => ({ id: m.id, mine: m.sender_id === auth.user.id, body: m.body, created_at: m.created_at })),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['customer', 'seller']);
  if ('res' in auth) return auth.res;
  try {
    const body = await req.json();
    const text = String(body.body || '').trim();
    if (!text) return fail('Write a message first');
    if (text.length > MAX_MESSAGE_LENGTH) return fail(`Messages can be up to ${MAX_MESSAGE_LENGTH} characters`);
    if (!(await allow(`msg:${auth.user.id}`, 20, 600))) return fail(TOO_MANY, 429);

    const found = await resolveThread(auth.user, { order: body.order, product: body.product, buyer: body.buyer });
    if ('error' in found) return fail(found.error, found.status);
    if (found.readOnly) return fail('You cannot write in this conversation', 403);
    const { thread } = found;

    const cleaned = hideContactDetails(text);
    const saved = await queryOne<{ id: string; created_at: string }>(
      `INSERT INTO messages (order_id, product_id, buyer_id, seller_id, sender_id, body) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
      [thread.orderId, thread.productId, thread.buyerId, thread.sellerId, auth.user.id, cleaned.text]
    );
    if (!saved) return fail('Could not send the message', 500);
    const recipientId = auth.user.id === thread.buyerId ? thread.sellerId : thread.buyerId;
    await relayMessage(thread, auth.user.id, recipientId, cleaned.text, saved.id);
    return NextResponse.json({ id: saved.id, created_at: saved.created_at, hidden: cleaned.hidden });
  } catch (error) {
    return handleError(error);
  }
}
