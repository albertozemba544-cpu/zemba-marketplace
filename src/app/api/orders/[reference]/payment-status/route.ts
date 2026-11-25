export const dynamic = 'force-dynamic';

// The order page asks this every few seconds while a payment is waiting. It checks with the provider what really happened.

import { NextRequest, NextResponse } from 'next/server';
import { getOrderByReference } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { confirmCollection } from '@/lib/paymentRun';
import { getPaymentProvider } from '@/lib/payments';
import { fail, handleError } from '@/lib/http';

export async function GET(req: NextRequest, { params }: { params: { reference: string } }) {
  const auth = await requireUser(req, ['customer']);
  if ('res' in auth) return auth.res;
  try {
    const order = await getOrderByReference(params.reference);
    if (!order || order.customer_id !== auth.user.id) return fail('Order not found', 404);
    if (order.status !== 'PENDING_PAYMENT') return NextResponse.json({ status: order.status === 'FUNDS_SECURED' ? 'FUNDS_SECURED' : order.status });
    const provider = getPaymentProvider();
    if (!provider) return NextResponse.json({ status: 'PENDING' });
    const status = await confirmCollection(order.order_reference, provider);
    return NextResponse.json({ status });
  } catch (error) {
    return handleError(error);
  }
}
