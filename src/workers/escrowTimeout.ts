import { logEvent, withTransaction } from '@/lib/db';
import { createNotification } from '@/lib/orders';
import { paymentsPaused } from '@/lib/settings';
import { SITE } from '@/lib/site';

// Runs once a day (see vercel.json). The rules (see src/lib/holding.ts):
//  1. Paid but not dispatched within 3 days          -> refund the buyer in full.
//  2. Dispatched, delivery window + 3 review days
//     over, buyer has not confirmed or disputed      -> the money is released to the seller automatically.
//  3. Never later than 14 days after payment (an open dispute is the only exception).
//  4. Before an automatic release                    -> warn the buyer twice (2 days before, then 1 day before)
//                                                      and tell the seller on the final day.
// Refunds and payouts are added to the admin "Money to move" list (refund_status / payout_status = DUE).
// While payments are paused from Admin Controls, nothing is released automatically.

type Row = { id: string; customer_id: string | null; seller_id: string | null };

export async function processEscrowTimeouts() {
  const paused = await paymentsPaused().catch(() => false);

  const result = await withTransaction(async (client) => {
    // 1. never dispatched in time
    const unshipped = await client.query(
      `UPDATE orders SET status = 'REFUNDED', refund_status = 'DUE', refund_due_at = now(), updated_at = now()
       WHERE status = 'FUNDS_SECURED' AND NOT admin_hold
         AND COALESCE(paid_at, updated_at) < now() - make_interval(days => $1)
       RETURNING id, customer_id, seller_id`,
      [SITE.dispatchDays]
    );
    for (const order of unshipped.rows as Row[]) {
      await logEvent(order.id, 'ESCROW_TIMEOUT_REFUND', { reason: `Seller did not dispatch within ${SITE.dispatchDays} days` }, client);
    }

    // older dispatched orders that have no release time yet get one (the same rule as at dispatch)
    await client.query(
      `UPDATE orders
          SET auto_release_at = LEAST(
                COALESCE(dispatched_at, updated_at) + make_interval(days => timeout_days + $1),
                COALESCE(paid_at, created_at) + make_interval(days => $2))
        WHERE status = 'DISPATCHED' AND auto_release_at IS NULL`,
      [SITE.reviewDays, SITE.maxHoldDays]
    );

    // 2 and 3. automatic release (the 14-day cap is enforced here again, whatever the stored date says)
    let released: Row[] = [];
    if (!paused) {
      const done = await client.query(
        `UPDATE orders
            SET status = 'COMPLETED', payout_status = 'DUE', payout_due_at = now(), release_method = 'AUTO_RELEASE', updated_at = now()
          WHERE status = 'DISPATCHED' AND NOT admin_hold
            AND LEAST(auto_release_at, COALESCE(paid_at, created_at) + make_interval(days => $1)) <= now()
          RETURNING id, customer_id, seller_id`,
        [SITE.maxHoldDays]
      );
      released = done.rows as Row[];
      for (const order of released) {
        await logEvent(order.id, 'AUTO_RELEASED', { reason: 'The buyer did not confirm or open a dispute before the release time' }, client);
      }
    }

    // 4. warnings before an automatic release
    // first warning: 48 hours before. If the order is already inside the last 24 hours, this counts as the final one.
    const first = await client.query(
      `UPDATE orders
          SET release_warnings_sent = CASE WHEN auto_release_at <= now() + interval '24 hours' THEN 2 ELSE 1 END
        WHERE status = 'DISPATCHED' AND NOT admin_hold AND release_warnings_sent = 0
          AND auto_release_at > now() AND auto_release_at <= now() + interval '48 hours'
        RETURNING id, customer_id, seller_id, release_warnings_sent`
    );
    const final = await client.query(
      `UPDATE orders SET release_warnings_sent = 2
        WHERE status = 'DISPATCHED' AND NOT admin_hold AND release_warnings_sent = 1
          AND auto_release_at > now() AND auto_release_at <= now() + interval '24 hours'
        RETURNING id, customer_id, seller_id`
    );
    for (const order of first.rows as Row[]) {
      await logEvent(order.id, 'RELEASE_WARNING_SENT', { stage: (order as any).release_warnings_sent === 2 ? 'final' : 'first' }, client);
    }
    for (const order of final.rows as Row[]) await logEvent(order.id, 'RELEASE_WARNING_SENT', { stage: 'final' }, client);

    return {
      unshipped: unshipped.rows as Row[],
      released,
      firstWarnings: (first.rows as (Row & { release_warnings_sent: number })[]).filter((r) => r.release_warnings_sent === 1),
      finalWarnings: [...(first.rows as (Row & { release_warnings_sent: number })[]).filter((r) => r.release_warnings_sent === 2), ...(final.rows as Row[])],
    };
  });

  // Emails, SMS and WhatsApp go out after the database changes are saved. A failed message never undoes a payment decision.
  const sends: Promise<unknown>[] = [];
  for (const order of result.unshipped) {
    if (order.customer_id) sends.push(createNotification(order.id, order.customer_id, 'REFUND_BUYER'));
    if (order.seller_id) sends.push(createNotification(order.id, order.seller_id, 'REFUND_SELLER'));
  }
  for (const order of result.released) {
    if (order.customer_id) sends.push(createNotification(order.id, order.customer_id, 'AUTO_RELEASE_BUYER'));
    if (order.seller_id) sends.push(createNotification(order.id, order.seller_id, 'AUTO_RELEASE_SELLER'));
  }
  for (const order of result.firstWarnings) {
    if (order.customer_id) sends.push(createNotification(order.id, order.customer_id, 'RELEASE_WARNING'));
  }
  for (const order of result.finalWarnings) {
    if (order.customer_id) sends.push(createNotification(order.id, order.customer_id, 'RELEASE_FINAL_WARNING'));
    if (order.seller_id) sends.push(createNotification(order.id, order.seller_id, 'RELEASE_SOON_SELLER'));
  }
  await Promise.allSettled(sends);

  return {
    refundedUnshipped: result.unshipped.length,
    autoReleased: result.released.length,
    firstWarnings: result.firstWarnings.length,
    finalWarnings: result.finalWarnings.length,
    paymentsPaused: paused,
  };
}
