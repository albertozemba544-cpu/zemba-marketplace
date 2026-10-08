// Seller trust numbers, worked out from real orders. Nothing here can be edited by a seller.

import { queryOne } from './db';
import type { SellerTrust } from './trustFormat';

export async function getSellerTrust(sellerId: string): Promise<SellerTrust | null> {
  const row = await queryOne<any>(
    `SELECT u.created_at AS member_since,
            COALESCE(v.verification_status = 'VERIFIED', false) AS verified,
            (SELECT COUNT(*) FROM orders o WHERE o.seller_id = u.id
               AND o.status IN ('FUNDS_SECURED', 'DISPATCHED', 'PENDING_ADMIN_REVIEW', 'COMPLETED', 'REFUNDED', 'DISPUTED')) AS paid_orders,
            (SELECT COUNT(*) FROM orders o WHERE o.seller_id = u.id AND o.status = 'COMPLETED') AS completed,
            (SELECT COUNT(DISTINCT dp.order_id) FROM disputes dp JOIN orders o ON o.id = dp.order_id WHERE o.seller_id = u.id) AS disputes,
            (SELECT COUNT(DISTINCT dp.order_id) FROM disputes dp JOIN orders o ON o.id = dp.order_id
               WHERE o.seller_id = u.id AND dp.status = 'RESOLVED_REFUND') AS disputes_lost,
            (SELECT COUNT(*) FROM transaction_events ev JOIN orders o ON o.id = ev.order_id
               WHERE o.seller_id = u.id AND ev.event_type = 'ESCROW_TIMEOUT_REFUND') AS no_ship_refunds,
            (SELECT AVG(EXTRACT(EPOCH FROM (sent.created_at - paid.created_at)) / 3600.0)
               FROM orders o
               JOIN transaction_events paid ON paid.order_id = o.id AND paid.event_type = 'PAYMENT_SECURED'
               JOIN transaction_events sent ON sent.order_id = o.id AND sent.event_type = 'DISPATCHED'
               WHERE o.seller_id = u.id) AS avg_dispatch_hours
     FROM users u
     LEFT JOIN vendor_verification v ON v.user_id = u.id
     WHERE u.id = $1 AND u.role = 'seller' AND u.approval_status = 'APPROVED' AND u.account_status = 'ACTIVE'`,
    [sellerId]
  );
  if (!row) return null;
  return {
    verified: Boolean(row.verified),
    member_since: row.member_since ? new Date(row.member_since).toISOString() : null,
    paid_orders: Number(row.paid_orders) || 0,
    completed: Number(row.completed) || 0,
    disputes: Number(row.disputes) || 0,
    disputes_lost: Number(row.disputes_lost) || 0,
    no_ship_refunds: Number(row.no_ship_refunds) || 0,
    avg_dispatch_hours: row.avg_dispatch_hours === null || row.avg_dispatch_hours === undefined ? null : Number(row.avg_dispatch_hours),
  };
}
