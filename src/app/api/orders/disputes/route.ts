import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const { order_id, buyer_id, seller_id, reason } = await req.json();

  if (!order_id || !buyer_id || !reason) {
    return NextResponse.json({ error: 'order_id, buyer_id, and reason are required' }, { status: 400 });
  }

  try {
    const dispute_id = randomUUID();
    db.prepare(`
      INSERT INTO order_disputes (id, order_id, buyer_id, seller_id, reason, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'OPEN', CURRENT_TIMESTAMP)
    `).run(dispute_id, order_id, buyer_id, seller_id || null, reason);

    // Update order status to DISPUTED
    db.prepare(`UPDATE orders SET status = 'DISPUTED' WHERE id = ?`).run(order_id);

    return NextResponse.json({ dispute_id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Unable to create dispute' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const order_id = searchParams.get('order_id');

  if (!order_id) {
    return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
  }

  try {
    const dispute = db.prepare(`
      SELECT * FROM order_disputes WHERE order_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(order_id) as { id: string | number; [key: string]: any };

    if (!dispute) {
      return NextResponse.json(null);
    }

    const messages = db.prepare(`
      SELECT id, sender_id, message, created_at FROM dispute_messages WHERE dispute_id = ? ORDER BY created_at ASC
    `).all(dispute.id);

    return NextResponse.json({ ...dispute, messages });
  } catch (error) {
    return NextResponse.json({ error: 'Unable to fetch dispute' }, { status: 500 });
  }
}
