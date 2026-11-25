export const dynamic = 'force-dynamic';

// The payment provider calls this address when a payment, payout or refund changes.
// Give the provider:  https://zemba.shop/api/payments/webhook
//
// We never trust what the call says on its own. Each provider file checks the signature, and then we ask the
// provider directly what happened before any order is marked paid.

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { confirmCollection, failTransfer, finalizeTransfer } from '@/lib/paymentRun';
import { getPaymentProvider, ProviderNotReadyError } from '@/lib/payments';

export async function POST(req: NextRequest) {
  const provider = getPaymentProvider();
  if (!provider) return NextResponse.json({ error: 'No payment provider is connected' }, { status: 503 });
  try {
    const raw = await req.text();
    const event = await provider.parseWebhook(raw, req.headers);
    if (!event) return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });

    if (event.kind === 'COLLECTION') {
      await confirmCollection(event.reference, provider);
    } else {
      const kind = event.kind === 'PAYOUT' ? 'payout' : 'refund';
      const order = await queryOne<{ id: string }>('SELECT id FROM orders WHERE order_reference = $1', [event.reference]);
      if (order) {
        if (event.status === 'SUCCESS') await finalizeTransfer(order.id, kind, event.providerRef);
        else if (event.status === 'FAILED') await failTransfer(order.id, kind, event.error || 'The provider reported a failure');
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ProviderNotReadyError) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error('Payment webhook error:', error);
    // 500 asks the provider to send it again later
    return NextResponse.json({ error: 'Could not process the webhook' }, { status: 500 });
  }
}
