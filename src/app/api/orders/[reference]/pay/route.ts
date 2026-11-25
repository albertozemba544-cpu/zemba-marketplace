export const dynamic = 'force-dynamic';

// Starts the buyer's payment.
//  - With a payment provider connected (PAYMENT_PROVIDER in Vercel): starts a collection with the provider.
//    The order is marked paid only after the provider confirms it (see /api/payments/webhook and payment-status).
//  - With no provider: a demo payment (no real money) works ONLY when ALLOW_DEMO_PAYMENTS=true.
//    Otherwise the buyer sees that online payment is not available yet.

import { NextRequest, NextResponse } from 'next/server';
import { getOrderByReference, logEvent, queryOne } from '@/lib/db';
import { demoPaymentsEnabled } from '@/lib/flags';
import { paymentsPaused } from '@/lib/settings';
import { requireUser } from '@/lib/auth';
import { markFundsSecured } from '@/lib/orders';
import { totalToPay } from '@/lib/fees';
import { siteUrl } from '@/lib/site';
import { getPaymentProvider, ProviderNotReadyError } from '@/lib/payments';
import { toMsisdn, toNetwork } from '@/lib/payments/phone';
import { fail, handleError } from '@/lib/http';

export async function POST(req: NextRequest, { params }: { params: { reference: string } }) {
  const auth = await requireUser(req, ['customer']);
  if ('res' in auth) return auth.res;
  try {
    const provider = getPaymentProvider();
    if (!provider && !demoPaymentsEnabled()) return fail('Online payment is not available yet.', 503);
    if (await paymentsPaused()) return fail('Payments are paused for a short while. Please try again soon.', 503);

    const order = await getOrderByReference(params.reference);
    if (!order || order.customer_id !== auth.user.id) return fail('Order not found', 404);
    if (order.status !== 'PENDING_PAYMENT') return fail(`Order is already ${order.status}`, 400);

    // make sure the item has not sold out since the order was created
    if (order.product_id) {
      const product = await queryOne<{ stock: number }>('SELECT stock FROM products WHERE id = $1', [order.product_id]);
      if (product && product.stock < order.quantity) return fail('Sorry, this item has just sold out.', 409);
    }

    // no provider: the old demo payment
    if (!provider) {
      const code = await markFundsSecured(order, `DEMO-MOMO-${Date.now()}`, 'DEMO_MOBILE_MONEY');
      if (!code) return fail('Order is no longer waiting for payment', 409);
      return NextResponse.json({ status: 'FUNDS_SECURED', delivery_code: code });
    }

    // a provider is connected
    let body: any = {};
    try { body = await req.json(); } catch { /* the buyer may send nothing */ }
    const buyer = await queryOne<{ full_name: string; email: string; phone_number: string }>('SELECT full_name, email, phone_number FROM users WHERE id = $1', [auth.user.id]);
    const payPhone = String(body.phone || buyer?.phone_number || '');
    const amount = totalToPay(Number(order.amount), Number(order.shipping_amount || 0));

    let result;
    try {
      result = await provider.createCollection({
        reference: order.order_reference,
        amount,
        description: `Zemba order ${order.order_reference}`,
        buyerName: buyer?.full_name || 'Zemba buyer',
        buyerEmail: buyer?.email,
        buyerPhone: toMsisdn(payPhone),
        network: toNetwork(body.network, payPhone),
        callbackUrl: `${siteUrl()}/api/payments/webhook`,
        returnUrl: `${siteUrl()}/checkout/${order.order_reference}`,
      });
    } catch (error) {
      if (error instanceof ProviderNotReadyError) return fail('Online payment is not available yet.', 503);
      console.error('Payment could not be started:', error);
      return fail('The payment could not be started. Please try again in a moment.', 502);
    }

    await queryOne(
      `UPDATE orders SET payment_provider = $1, gateway_transaction_id = $2, updated_at = now() WHERE id = $3 AND status = 'PENDING_PAYMENT' RETURNING id`,
      [provider.name, result.providerRef, order.id]
    );
    await logEvent(order.id, 'PAYMENT_STARTED', { provider: provider.name, provider_ref: result.providerRef, amount });

    if (result.status === 'FAILED') return fail('The payment was declined. Please try again.', 402);
    if (result.status === 'SUCCESS') {
      const code = await markFundsSecured(order, result.providerRef, provider.name);
      return NextResponse.json({ status: 'FUNDS_SECURED', delivery_code: code });
    }
    return NextResponse.json({ status: 'PENDING', redirect_url: result.redirectUrl || null, instructions: result.instructions || null });
  } catch (error) {
    return handleError(error);
  }
}
