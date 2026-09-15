import { db, logEvent } from '@/lib/db';

export function processEscrowTimeouts() {
  const unshippedOrders = db.prepare(`
    SELECT id FROM orders
    WHERE status = 'FUNDS_SECURED'
      AND julianday('now') - julianday(updated_at) > 3
  `).all() as { id: string }[];
  const overdueDispatches = db.prepare(`
    SELECT id, waybill_image_url FROM orders
    WHERE status = 'DISPATCHED'
      AND julianday('now') - julianday(updated_at) > timeout_days
  `).all() as { id: string; waybill_image_url: string | null }[];
  const warningDispatches = db.prepare(`
    SELECT id, timeout_days FROM orders
    WHERE status = 'DISPATCHED' AND timeout_warning_sent_at IS NULL
      AND julianday('now') - julianday(updated_at) >= timeout_days - 2
      AND julianday('now') - julianday(updated_at) < timeout_days
  `).all() as { id: string; timeout_days: number }[];

  const refund = db.transaction(() => {
    for (const order of unshippedOrders) {
      db.prepare(`
        UPDATE orders SET status = 'REFUNDED', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'FUNDS_SECURED'
      `).run(order.id);
      logEvent(order.id, 'ESCROW_TIMEOUT_REFUND', { reason: 'Seller failed to dispatch within 3 days' });
    }
    for (const order of overdueDispatches) {
      const status = order.waybill_image_url ? 'PENDING_ADMIN_REVIEW' : 'REFUNDED';
      db.prepare(`UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'DISPATCHED'`).run(status, order.id);
      logEvent(order.id, status === 'PENDING_ADMIN_REVIEW' ? 'ESCROW_TIMEOUT_ADMIN_REVIEW' : 'ESCROW_TIMEOUT_REFUND', {
        reason: order.waybill_image_url ? 'Transit window expired; proof of dispatch requires review' : 'Transit window expired with no proof of dispatch',
      });
    }
    for (const order of warningDispatches) {
      db.prepare(`UPDATE orders SET timeout_warning_sent_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'DISPATCHED'`).run(order.id);
      logEvent(order.id, 'TRANSIT_WINDOW_WARNING', {
        message: 'Your order is still in transit. Confirm delivery or extend your protection window by 7 days.',
        days_remaining: 2,
      });
    }
  });
  refund();
  return { refunded: unshippedOrders.length + overdueDispatches.filter((order) => !order.waybill_image_url).length, pendingAdminReview: overdueDispatches.filter((order) => order.waybill_image_url).length, warnings: warningDispatches.length };
}

if (require.main === module) {
  console.log(processEscrowTimeouts());
}