import { logEvent, withTransaction } from '@/lib/db';
import { createNotification } from '@/lib/orders';

// Runs once a day (see vercel.json). Rules:
//  - paid but not dispatched within 3 days  -> refund the buyer
//  - dispatched, transit window expired     -> admin review (if there is proof) or refund
//  - 2 days before the window ends          -> warn the buyer (email + SMS)
// Refunds are added to the admin "Money to move" list (refund_status = DUE).

type Row = { id: string; customer_id: string | null; seller_id: string | null };

export async function processEscrowTimeouts() {
  const result = await withTransaction(async (client) => {
    const unshipped = await client.query(
      `UPDATE orders SET status = 'REFUNDED', refund_status = 'DUE', updated_at = now()
       WHERE status = 'FUNDS_SECURED' AND updated_at < now() - interval '3 days'
       RETURNING id, customer_id, seller_id`
    );
    for (const order of unshipped.rows as Row[]) {
      await logEvent(order.id, 'ESCROW_TIMEOUT_REFUND', { reason: 'Seller failed to dispatch within 3 days' }, client);
    }

    const overdue = await client.query(
      `UPDATE orders
         SET status = CASE WHEN waybill_image_url IS NULL THEN 'REFUNDED' ELSE 'PENDING_ADMIN_REVIEW' END,
             refund_status = CASE WHEN waybill_image_url IS NULL THEN 'DUE' ELSE refund_status END,
             updated_at = now()
       WHERE status = 'DISPATCHED' AND updated_at + make_interval(days => timeout_days) < now()
       RETURNING id, status, customer_id, seller_id`
    );
    for (const order of overdue.rows as (Row & { status: string })[]) {
      const review = order.status === 'PENDING_ADMIN_REVIEW';
      await logEvent(
        order.id,
        review ? 'ESCROW_TIMEOUT_ADMIN_REVIEW' : 'ESCROW_TIMEOUT_REFUND',
        { reason: review ? 'Transit window expired; proof of dispatch requires review' : 'Transit window expired with no proof of dispatch' },
        client
      );
    }

    const warnings = await client.query(
      `UPDATE orders SET timeout_warning_sent_at = now()
       WHERE status = 'DISPATCHED' AND timeout_warning_sent_at IS NULL
         AND updated_at + make_interval(days => timeout_days - 2) <= now()
       RETURNING id, customer_id, seller_id`
    );
    for (const order of warnings.rows as Row[]) {
      await logEvent(
        order.id,
        'TRANSIT_WINDOW_WARNING',
        { message: 'Your order is still in transit. Confirm delivery or extend your protection window by 7 days.', days_remaining: 2 },
        client
      );
    }

    return {
      unshipped: unshipped.rows as Row[],
      overdue: overdue.rows as (Row & { status: string })[],
      warnings: warnings.rows as Row[],
    };
  });

  // Emails and SMS go out after the database changes are saved.
  const sends: Promise<unknown>[] = [];
  for (const order of result.unshipped) {
    if (order.customer_id) sends.push(createNotification(order.id, order.customer_id, 'REFUND_BUYER'));
    if (order.seller_id) sends.push(createNotification(order.id, order.seller_id, 'REFUND_SELLER'));
  }
  for (const order of result.overdue) {
    if (order.status === 'REFUNDED') {
      if (order.customer_id) sends.push(createNotification(order.id, order.customer_id, 'REFUND_BUYER'));
      if (order.seller_id) sends.push(createNotification(order.id, order.seller_id, 'REFUND_SELLER'));
    }
  }
  for (const order of result.warnings) {
    if (order.customer_id) sends.push(createNotification(order.id, order.customer_id, 'TRANSIT_WARNING'));
  }
  await Promise.allSettled(sends);

  return {
    refunded: result.unshipped.length + result.overdue.filter((o) => o.status === 'REFUNDED').length,
    pendingAdminReview: result.overdue.filter((o) => o.status === 'PENDING_ADMIN_REVIEW').length,
    warnings: result.warnings.length,
  };
}
