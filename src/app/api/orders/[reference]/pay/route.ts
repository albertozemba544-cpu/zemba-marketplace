export const dynamic = 'force-dynamic';

// Demo payment: marks the order as paid without charging anyone.
// Turn it off with ALLOW_DEMO_PAYMENTS=false once a real gateway is connected;
// the real flow then goes through /api/webhook/momo.

import { NextRequest, NextResponse } from 'next/server';
import { getOrderByReference } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { markFundsSecured } from '@/lib/orders';
import { fail, handleError } from '@/lib/http';

export async function POST(req: NextRequest, { params }: { params: { reference: string } }) {
  const auth = await requireUser(req, ['customer']);
  if ('res' in auth) return auth.res;
  try {
    if (process.env.ALLOW_DEMO_PAYMENTS === 'false') {
      return fail('Online payment is not available yet.', 503);
    }
    const order = await getOrderByReference(params.reference);
    if (!order || order.customer_id !== auth.user.id) return fail('Order not found', 404);
    if (order.status !== 'PENDING_PAYMENT') return fail(`Order is already ${order.status}`, 400);

    const code = await markFundsSecured(order, `DEMO-MOMO-${Date.now()}`, 'DEMO_MOBILE_MONEY');
    if (!code) return fail('Order is no longer waiting for payment', 409);
    return NextResponse.json({ status: 'FUNDS_SECURED', delivery_code: code });
  } catch (error) {
    return handleError(error);
  }
}
