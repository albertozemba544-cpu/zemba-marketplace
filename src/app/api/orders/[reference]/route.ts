export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { fail, handleError } from '@/lib/http';
import { withBuyerFees } from '@/lib/fees';

export async function GET(req: NextRequest, { params }: { params: { reference: string } }) {
  const auth = await requireUser(req);
  if ('res' in auth) return auth.res;
  try {
    const order = await queryOne<any>(
      `SELECT o.*, p.title, u.business_name, u.full_name AS seller_name,
              EXISTS (SELECT 1 FROM transaction_events e WHERE e.order_id = o.id AND e.event_type = 'BUYER_CANCELLED') AS cancelled
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       LEFT JOIN users u ON u.id = o.seller_id
       WHERE o.order_reference = $1`,
      [params.reference]
    );
    const { user } = auth;
    if (!order || (user.role !== 'admin' && order.customer_id !== user.id && order.seller_id !== user.id)) {
      return fail('Order not found', 404);
    }
    // only the buyer gets to see the delivery code
    if (order.customer_id !== user.id) delete order.delivery_code;
    return NextResponse.json(withBuyerFees(order));
  } catch (error) {
    return handleError(error, 'Unable to fetch order');
  }
}
