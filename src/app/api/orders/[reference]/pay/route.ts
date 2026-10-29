export const dynamic = 'force-dynamic';

// Demo payment: marks the order as paid without charging anyone.
// It works ONLY when ALLOW_DEMO_PAYMENTS=true is set in Vercel (off by default, so a missing setting can never let
// anyone pay with pretend money). Real payments will go through the payment provider instead.

import { NextRequest, NextResponse } from 'next/server';
import { getOrderByReference, queryOne } from '@/lib/db';
import { demoPaymentsEnabled } from '@/lib/flags';
import { requireUser } from '@/lib/auth';
import { markFundsSecured } from '@/lib/orders';
import { fail, handleError } from '@/lib/http';

export async function POST(req: NextRequest, { params }: { params: { reference: string } }) {
  const auth = await requireUser(req, ['customer']);
  if ('res' in auth) return auth.res;
  try {
    if (!demoPaymentsEnabled()) {
      return fail('Online payment is not available yet.', 503);
    }
    const order = await getOrderByReference(params.reference);
    if (!order || order.customer_id !== auth.user.id) return fail('Order not found', 404);
    if (order.status !== 'PENDING_PAYMENT') return fail(`Order is already ${order.status}`, 400);

    // make sure the item has not sold out since the order was created
    if (order.product_id) {
      const product = await queryOne<{ stock: number }>('SELECT stock FROM products WHERE id = $1', [order.product_id]);
      if (product && product.stock < order.quantity) return fail('Sorry, this item has just sold out.', 409);
    }

    const code = await markFundsSecured(order, `DEMO-MOMO-${Date.now()}`, 'DEMO_MOBILE_MONEY');
    if (!code) return fail('Order is no longer waiting for payment', 409);
    return NextResponse.json({ status: 'FUNDS_SECURED', delivery_code: code });
  } catch (error) {
    return handleError(error);
  }
}
