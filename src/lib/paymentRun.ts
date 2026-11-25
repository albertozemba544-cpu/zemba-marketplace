// Everything that moves real money through a payment provider: confirming a buyer's payment, sending seller
// payouts and buyer refunds, reconciling them, and the timers. It all stays switched off until a provider is
// connected (PAYMENT_PROVIDER in Vercel). Until then, payouts and refunds are sent by hand from Admin, Money to move.

import { logEvent, query, queryOne, withTransaction } from './db';
import { alertAdmin } from './alerts';
import { cancellationRefund, fullRefund, totalToPay } from './fees';
import { createNotification, markFundsSecured } from './orders';
import { allocateDeductions } from './sellerCharges';
import { paymentsPaused } from './settings';
import { SITE, siteUrl } from './site';
import { autoPayoutsEnabled, getPaymentProvider, ProviderNotReadyError } from './payments';
import type { PaymentProvider } from './payments';
import { toMsisdn, toNetwork } from './payments/phone';

export type Kind = 'payout' | 'refund';

const OFFSET_REF = 'Offset against refund charges';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ---------------------------------------------------------------------------------------------------------
// Buyer pays: confirm with the provider, then secure the order
// ---------------------------------------------------------------------------------------------------------

/** Asks the provider what really happened to the buyer's payment. Marks the order paid only on a confirmed success. */
export async function confirmCollection(reference: string, provider: PaymentProvider): Promise<'FUNDS_SECURED' | 'PENDING' | 'FAILED' | 'NOT_FOUND'> {
  const order = await queryOne<any>(
    `SELECT id, order_reference, status, amount, shipping_amount, seller_id, customer_id, product_id, quantity, gateway_transaction_id
     FROM orders WHERE order_reference = $1`,
    [reference]
  );
  if (!order) return 'NOT_FOUND';
  if (order.status !== 'PENDING_PAYMENT') return order.status === 'PENDING_PAYMENT' ? 'PENDING' : 'FUNDS_SECURED';
  if (!order.gateway_transaction_id) return 'PENDING';

  const real = await provider.getCollectionStatus(order.gateway_transaction_id, order.order_reference);
  if (real.status === 'FAILED') {
    await logEvent(order.id, 'PAYMENT_FAILED', { provider: provider.name });
    return 'FAILED';
  }
  if (real.status !== 'SUCCESS') return 'PENDING';

  // the amount paid must cover the order. If the provider tells us the amount and it is short, do not accept it.
  const expected = totalToPay(Number(order.amount), Number(order.shipping_amount || 0));
  if (real.amount !== undefined && real.amount + 0.005 < expected) {
    await logEvent(order.id, 'PAYMENT_AMOUNT_MISMATCH', { expected, received: real.amount });
    await alertAdmin('A payment does not match its order', `Order ${order.order_reference}: expected K${expected.toFixed(2)} but the provider reports K${real.amount.toFixed(2)}. The order was NOT marked as paid.`);
    return 'PENDING';
  }
  const code = await markFundsSecured(order, order.gateway_transaction_id, provider.name);
  return code ? 'FUNDS_SECURED' : 'PENDING';
}

// ---------------------------------------------------------------------------------------------------------
// Money out: seller payouts and buyer refunds
// ---------------------------------------------------------------------------------------------------------

async function loadTransfer(orderId: string, kind: Kind) {
  return queryOne<any>(
    kind === 'payout'
      ? `SELECT o.id, o.order_reference, o.net_amount, o.seller_id AS person_id, s.momo_provider AS network, s.momo_number AS phone
         FROM orders o JOIN users s ON s.id = o.seller_id
         WHERE o.id = $1 AND o.status = 'COMPLETED' AND o.payout_status = 'DUE' AND NOT o.admin_hold`
      : `SELECT o.id, o.order_reference, o.amount, o.shipping_amount, o.customer_id AS person_id, b.phone_number AS phone, NULL AS network,
                EXISTS (SELECT 1 FROM transaction_events e WHERE e.order_id = o.id AND e.event_type = 'BUYER_CANCELLED') AS cancelled
         FROM orders o JOIN users b ON b.id = o.customer_id
         WHERE o.id = $1 AND o.status = 'REFUNDED' AND o.refund_status = 'DUE' AND NOT o.admin_hold`,
    [orderId]
  );
}

/** Marks a payout or refund as sent. Used when the provider confirms, or when a charge fully used up a payout. */
export async function finalizeTransfer(orderId: string, kind: Kind, providerRef: string) {
  const sql = kind === 'payout'
    ? `UPDATE orders SET payout_status = 'PAID', payout_reference = $1, payout_paid_at = now(), payment_error = NULL, updated_at = now()
       WHERE id = $2 AND payout_status IN ('PROCESSING', 'DUE') RETURNING id, seller_id, customer_id`
    : `UPDATE orders SET refund_status = 'PAID', refund_reference = $1, refund_paid_at = now(), payment_error = NULL, updated_at = now()
       WHERE id = $2 AND refund_status IN ('PROCESSING', 'DUE') RETURNING id, seller_id, customer_id`;
  const order = await queryOne<{ id: string; seller_id: string | null; customer_id: string | null }>(sql, [providerRef, orderId]);
  if (!order) return false;
  await logEvent(order.id, kind === 'payout' ? 'PAYOUT_SENT' : 'REFUND_SENT', { reference: providerRef, automatic: providerRef !== OFFSET_REF });
  const person = kind === 'payout' ? order.seller_id : order.customer_id;
  if (person) await createNotification(order.id, person, kind === 'payout' ? 'PAYOUT_SENT' : 'REFUND_SENT', undefined, providerRef === OFFSET_REF ? undefined : providerRef).catch(() => null);
  return true;
}

/** A payout or refund failed. Puts the money back on the due list as FAILED so an admin can retry, and frees any refund charge taken. */
export async function failTransfer(orderId: string, kind: Kind, error: string) {
  await queryOne(
    kind === 'payout'
      ? `UPDATE orders SET payout_status = 'FAILED', payment_error = $1, updated_at = now() WHERE id = $2 AND payout_status IN ('PROCESSING', 'DUE') RETURNING id`
      : `UPDATE orders SET refund_status = 'FAILED', payment_error = $1, updated_at = now() WHERE id = $2 AND refund_status IN ('PROCESSING', 'DUE') RETURNING id`,
    [error.slice(0, 500), orderId]
  );
  if (kind === 'payout') await reverseDeduction(orderId);
  await logEvent(orderId, kind === 'payout' ? 'PAYOUT_FAILED' : 'REFUND_FAILED', { error });
  const ref = await queryOne<{ order_reference: string }>('SELECT order_reference FROM orders WHERE id = $1', [orderId]);
  await alertAdmin(`A ${kind} failed`, `Order ${ref?.order_reference}: ${error}. Open Admin, Money to move, to retry it or send it by hand.`);
}

/** If refund charges were taken off a payout that then failed, give them back so they are taken from the next one. */
async function reverseDeduction(orderId: string) {
  const net = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM((payload->>'amount')::numeric), 0) AS total FROM transaction_events WHERE order_id = $1 AND event_type = 'SELLER_CHARGE_DEDUCTED'`,
    [orderId]
  );
  const amount = Number(net?.total || 0);
  if (amount > 0) await logEvent(orderId, 'SELLER_CHARGE_DEDUCTED', { amount: -amount, reason: 'payout failed, charge returned' });
}

/**
 * Sends one payout or refund through the provider.
 * Returns { ok: true } when it was started (it may still be PROCESSING), or { ok: false, error }.
 */
export async function sendTransfer(orderId: string, kind: Kind, actor = 'system'): Promise<{ ok: boolean; error?: string; status?: string }> {
  const provider = getPaymentProvider();
  if (!provider) return { ok: false, error: 'No payment provider is connected yet. Send it by hand and mark it as sent.' };
  if (await paymentsPaused()) return { ok: false, error: 'Payments are paused from Admin Controls.' };

  const row = await loadTransfer(orderId, kind);
  if (!row) return { ok: false, error: 'This payment is not waiting to be sent (it may already be sent, or the order is on hold).' };

  // work out the amount: a payout is reduced by refund charges the seller owes; a refund depends on how it came about
  let deduction = 0;
  let amount: number;
  if (kind === 'payout') {
    deduction = (await allocateDeductions(row.person_id)).get(row.id) || 0;
    amount = Math.round((Number(row.net_amount) - deduction) * 100) / 100;
  } else {
    amount = row.cancelled
      ? cancellationRefund(Number(row.amount), Number(row.shipping_amount || 0))
      : fullRefund(Number(row.amount), Number(row.shipping_amount || 0));
  }

  // claim it, so two runs can never send the same payment twice
  const claimed = await queryOne<{ id: string }>(
    kind === 'payout'
      ? `UPDATE orders SET payout_status = 'PROCESSING', payment_error = NULL, updated_at = now() WHERE id = $1 AND payout_status = 'DUE' RETURNING id`
      : `UPDATE orders SET refund_status = 'PROCESSING', payment_error = NULL, updated_at = now() WHERE id = $1 AND refund_status = 'DUE' RETURNING id`,
    [orderId]
  );
  if (!claimed) return { ok: false, error: 'This payment was just picked up by someone else.' };
  if (deduction > 0) await logEvent(orderId, 'SELLER_CHARGE_DEDUCTED', { amount: deduction, actor });

  // nothing left to send: the refund charges used it all up
  if (kind === 'payout' && amount <= 0) {
    await finalizeTransfer(orderId, kind, OFFSET_REF);
    return { ok: true, status: 'PAID' };
  }

  try {
    const result = await provider.createTransfer({
      reference: `${row.order_reference}-${kind === 'payout' ? 'PAYOUT' : 'REFUND'}`,
      amount,
      phone: toMsisdn(row.phone),
      network: toNetwork(row.network, row.phone),
      description: kind === 'payout' ? `Zemba payout for order ${row.order_reference}` : `Zemba refund for order ${row.order_reference}`,
      callbackUrl: `${siteUrl()}/api/payments/webhook`,
    });
    await queryOne(
      kind === 'payout'
        ? 'UPDATE orders SET payout_provider_ref = $1, payment_provider = COALESCE(payment_provider, $3) WHERE id = $2 RETURNING id'
        : 'UPDATE orders SET refund_provider_ref = $1, payment_provider = COALESCE(payment_provider, $3) WHERE id = $2 RETURNING id',
      [result.providerRef, orderId, provider.name]
    );
    await logEvent(orderId, kind === 'payout' ? 'PAYOUT_STARTED' : 'REFUND_STARTED', { amount, provider: provider.name, provider_ref: result.providerRef, actor });
    if (result.status === 'SUCCESS') { await finalizeTransfer(orderId, kind, result.providerRef); return { ok: true, status: 'PAID' }; }
    if (result.status === 'FAILED') { await failTransfer(orderId, kind, result.error || 'The provider declined the payment'); return { ok: false, error: result.error || 'The provider declined the payment', status: 'FAILED' }; }
    return { ok: true, status: 'PROCESSING' };
  } catch (error) {
    if (error instanceof ProviderNotReadyError) {
      // nothing was sent: put it back exactly as it was
      await queryOne(
        kind === 'payout'
          ? `UPDATE orders SET payout_status = 'DUE', updated_at = now() WHERE id = $1 RETURNING id`
          : `UPDATE orders SET refund_status = 'DUE', updated_at = now() WHERE id = $1 RETURNING id`,
        [orderId]
      );
      if (kind === 'payout') await reverseDeduction(orderId);
      return { ok: false, error: error.message };
    }
    await failTransfer(orderId, kind, errorText(error));
    return { ok: false, error: errorText(error), status: 'FAILED' };
  }
}

/** Puts a FAILED payout or refund back on the due list. */
export async function retryTransfer(orderId: string, kind: Kind) {
  return queryOne<{ id: string }>(
    kind === 'payout'
      ? `UPDATE orders SET payout_status = 'DUE', payout_due_at = now(), payment_error = NULL WHERE id = $1 AND payout_status = 'FAILED' RETURNING id`
      : `UPDATE orders SET refund_status = 'DUE', refund_due_at = now(), payment_error = NULL WHERE id = $1 AND refund_status = 'FAILED' RETURNING id`,
    [orderId]
  );
}

// ---------------------------------------------------------------------------------------------------------
// The daily timers
// ---------------------------------------------------------------------------------------------------------

/** Asks the provider about payouts and refunds that are still PROCESSING and settles them. */
export async function reconcileTransfers(): Promise<number> {
  const provider = getPaymentProvider();
  if (!provider) return 0;
  const rows = await query<any>(
    `SELECT id, order_reference, 'payout' AS kind, payout_provider_ref AS provider_ref FROM orders WHERE payout_status = 'PROCESSING' AND payout_provider_ref IS NOT NULL
     UNION ALL
     SELECT id, order_reference, 'refund' AS kind, refund_provider_ref AS provider_ref FROM orders WHERE refund_status = 'PROCESSING' AND refund_provider_ref IS NOT NULL
     LIMIT 50`
  );
  let settled = 0;
  for (const row of rows) {
    try {
      const real = await provider.getTransferStatus(row.provider_ref, `${row.order_reference}-${row.kind === 'payout' ? 'PAYOUT' : 'REFUND'}`);
      if (real.status === 'SUCCESS') { await finalizeTransfer(row.id, row.kind, row.provider_ref); settled++; }
      else if (real.status === 'FAILED') { await failTransfer(row.id, row.kind, real.error || 'The provider reported a failure'); settled++; }
    } catch { /* try again tomorrow */ }
  }
  return settled;
}

/** With AUTO_PAYOUTS=true, sends every due payout and refund through the provider. */
export async function processDuePayments(): Promise<{ payouts: number; refunds: number; failed: number }> {
  const result = { payouts: 0, refunds: 0, failed: 0 };
  if (!autoPayoutsEnabled() || (await paymentsPaused())) return result;
  const payouts = await query<{ id: string }>(`SELECT id FROM orders WHERE status = 'COMPLETED' AND payout_status = 'DUE' AND NOT admin_hold ORDER BY COALESCE(payout_due_at, updated_at) LIMIT 25`);
  for (const row of payouts) { const r = await sendTransfer(row.id, 'payout'); r.ok ? result.payouts++ : result.failed++; }
  const refunds = await query<{ id: string }>(`SELECT id FROM orders WHERE status = 'REFUNDED' AND refund_status = 'DUE' AND NOT admin_hold ORDER BY COALESCE(refund_due_at, updated_at) LIMIT 25`);
  for (const row of refunds) { const r = await sendTransfer(row.id, 'refund'); r.ok ? result.refunds++ : result.failed++; }
  return result;
}

/** Tells the admin about payouts and refunds that have waited longer than the promised time. */
export async function alertOverduePayments(): Promise<number> {
  const rows = await query<{ order_reference: string; kind: string; hours: number }>(
    `SELECT order_reference, 'payout' AS kind, EXTRACT(EPOCH FROM (now() - COALESCE(payout_due_at, updated_at))) / 3600 AS hours
       FROM orders WHERE status = 'COMPLETED' AND payout_status IN ('DUE', 'FAILED') AND now() - COALESCE(payout_due_at, updated_at) > make_interval(hours => $1)
     UNION ALL
     SELECT order_reference, 'refund', EXTRACT(EPOCH FROM (now() - COALESCE(refund_due_at, updated_at))) / 3600
       FROM orders WHERE status = 'REFUNDED' AND refund_status IN ('DUE', 'FAILED') AND now() - COALESCE(refund_due_at, updated_at) > make_interval(hours => $1)
     ORDER BY 3 DESC LIMIT 30`,
    [SITE.payoutHours]
  );
  if (rows.length > 0) {
    const lines = rows.map((r) => `${r.kind} for order ${r.order_reference}: waiting ${Math.round(Number(r.hours))} hours`).join('\n');
    await alertAdmin(`${rows.length} payout${rows.length === 1 ? '' : 's'} or refund${rows.length === 1 ? '' : 's'} overdue`, `We promise payouts and refunds within ${SITE.payoutHours} hours. These are late:\n${lines}\n\nOpen Admin, Money to move.`);
  }
  return rows.length;
}

export { withTransaction };
