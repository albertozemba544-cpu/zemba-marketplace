export const dynamic = 'force-dynamic';

// POST /api/webhook/momo
// The payment gateway calls this once a buyer completes payment.
// Needs WEBHOOK_SECRET and real gateway credentials - see README.

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getOrderByReference, logEvent } from '@/lib/db';
import { markFundsSecured } from '@/lib/orders';
import { fail, handleError } from '@/lib/http';

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.WEBHOOK_SECRET || '';
    const rawBody = await req.text();
    const signature = req.headers.get('x-gateway-signature') || '';

    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (!secret || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return fail('Invalid webhook signature', 401);
    }

    const body = JSON.parse(rawBody);
    const { referenceId, externalId, status } = body;

    const order = await getOrderByReference(String(externalId || ''));
    if (!order) return fail('Order not found', 404);

    if (status === 'SUCCESSFUL') {
      // TODO: also compare the amount reported by the gateway with order.amount.
      const code = await markFundsSecured(order, String(referenceId || `GATEWAY-${Date.now()}`), 'MOBILE_MONEY');
      if (code) await logEvent(order.id, 'FUNDS_SECURED', body);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    return handleError(error);
  }
}
