import { logEvent, withTransaction } from '@/lib/db';

// Runs once a day (see vercel.json). Rules:
//  - paid but not dispatched within 3 days  -> refund the buyer
//  - dispatched, transit window expired     -> admin review (if there is proof) or refund
//  - 2 days before the window ends          -> log a warning for the buyer
export async function processEscrowTimeouts() {
  return withTransaction(async (client) => {
    const unshipped = await client.query(
      `UPDATE orders SET status = 'REFUNDED', updated_at = now()
       WHERE status = 'FUNDS_SECURED' AND updated_at < now() - interval '3 days'
       RETURNING id`
    );
    for (const order of unshipped.rows) {
      await logEvent(order.id, 'ESCROW_TIMEOUT_REFUND', { reason: 'Seller failed to dispatch within 3 days' }, client);
    }

    const overdue = await client.query(
      `UPDATE orders
         SET status = CASE WHEN waybill_image_url IS NULL THEN 'REFUNDED' ELSE 'PENDING_ADMIN_REVIEW' END,
             updated_at = now()
       WHERE status = 'DISPATCHED' AND updated_at + make_interval(days => timeout_days) < now()
       RETURNING id, status`
    );
    for (const order of overdue.rows) {
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
       RETURNING id`
    );
    for (const order of warnings.rows) {
      await logEvent(
        order.id,
        'TRANSIT_WINDOW_WARNING',
        { message: 'Your order is still in transit. Confirm delivery or extend your protection window by 7 days.', days_remaining: 2 },
        client
      );
    }

    return {
      refunded: unshipped.rowCount! + overdue.rows.filter((o) => o.status === 'REFUNDED').length,
      pendingAdminReview: overdue.rows.filter((o) => o.status === 'PENDING_ADMIN_REVIEW').length,
      warnings: warnings.rowCount!,
    };
  });
}
