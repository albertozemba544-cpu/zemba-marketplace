// POST /api/webhook/momo
// Payment gateway calls this once a buyer completes payment. Not testable
// until you have real gateway credentials and a public HTTPS URL — see README.

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db, getOrderByReference, logEvent } from '@/lib/db';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-gateway-signature');

  const computedSig = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
  if (!WEBHOOK_SECRET || signature !== computedSig) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const { referenceId, externalId, status } = body;

  const order = getOrderByReference(externalId);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  if (status === 'SUCCESSFUL') {
    const deliveryCode = String(Math.floor(1000 + Math.random() * 9000));
    db.prepare(`
      UPDATE orders SET status = 'FUNDS_SECURED', gateway_transaction_id = ?, delivery_code = ?, timeout_days = 3, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(referenceId, deliveryCode, order.id);
    logEvent(order.id, 'FUNDS_SECURED', body);
    // TODO: notify seller by SMS/WhatsApp (Africa's Talking), schedule 7-day auto-refund check.
  }

  return NextResponse.json({ received: true });
}
