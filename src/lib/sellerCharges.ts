// Refund charges: when an order is refunded because of the seller (did not dispatch, no proof of dispatch,
// item not as described, dispute lost), the seller owes a small charge to cover the cost of that refund.
// It is taken off their next payouts automatically. Admin can waive a charge for a good reason.
//
// Nothing extra is stored in the orders table. The charges are worked out from the orders themselves
// (REFUNDED, not cancelled by the buyer, not waived) and every deduction and waiver is a row in transaction_events.

import { query, queryOne } from './db';
import { SITE } from './site';

// SQL fragments shared by the queries below. $1 = seller id, $2 = percent, $3 = minimum, $4 = start date.
const CHARGE_SQL = 'LEAST(o.amount, GREATEST(ROUND(o.amount * $2::numeric / 100, 2), $3::numeric))';
const CHARGEABLE = `o.status = 'REFUNDED' AND o.updated_at >= $4::date
  AND NOT EXISTS (SELECT 1 FROM transaction_events e WHERE e.order_id = o.id AND e.event_type = 'BUYER_CANCELLED')
  AND NOT EXISTS (SELECT 1 FROM transaction_events e WHERE e.order_id = o.id AND e.event_type = 'SELLER_CHARGE_WAIVED')`;
const PARAMS = (sellerId: string) => [sellerId, SITE.sellerChargePercent, SITE.sellerChargeMin, SITE.sellerChargesFrom];

/** How much this seller still owes in refund charges. */
export async function sellerChargeOwed(sellerId: string): Promise<number> {
  const charged = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(${CHARGE_SQL}), 0) AS total FROM orders o WHERE o.seller_id = $1 AND ${CHARGEABLE}`,
    PARAMS(sellerId)
  );
  const deducted = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM((e.payload->>'amount')::numeric), 0) AS total
     FROM transaction_events e JOIN orders o ON o.id = e.order_id
     WHERE o.seller_id = $1 AND e.event_type = 'SELLER_CHARGE_DEDUCTED'`,
    [sellerId]
  );
  return Math.max(0, Math.round((Number(charged?.total || 0) - Number(deducted?.total || 0)) * 100) / 100);
}

/** The charges that make up what a seller owes (for the admin screen). */
export async function sellerChargeOrders(sellerId: string) {
  return query<{ id: string; order_reference: string; amount: number; charge: number; updated_at: string }>(
    `SELECT o.id, o.order_reference, o.amount, ${CHARGE_SQL} AS charge, o.updated_at
     FROM orders o WHERE o.seller_id = $1 AND ${CHARGEABLE} ORDER BY o.updated_at ASC`,
    PARAMS(sellerId)
  );
}

/**
 * Shares what a seller owes across their payouts that are due, oldest first.
 * Returns how much to deduct from each payout (by order id).
 */
export async function allocateDeductions(sellerId: string): Promise<Map<string, number>> {
  let remaining = await sellerChargeOwed(sellerId);
  const result = new Map<string, number>();
  if (remaining <= 0) return result;
  const due = await query<{ id: string; net_amount: number }>(
    `SELECT id, net_amount FROM orders
     WHERE seller_id = $1 AND status = 'COMPLETED' AND payout_status = 'DUE' ORDER BY updated_at ASC, id ASC`,
    [sellerId]
  );
  for (const order of due) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, Number(order.net_amount));
    result.set(order.id, Math.round(take * 100) / 100);
    remaining = Math.round((remaining - take) * 100) / 100;
  }
  return result;
}
