export const dynamic = 'force-dynamic';

// The numbers for the admin "Today" page: what needs a person, and a simple money snapshot.

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { paymentsPaused } from '@/lib/settings';
import { handleError } from '@/lib/http';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const needs = await queryOne<any>(
      `SELECT
         (SELECT COUNT(*) FROM disputes WHERE status = 'OPEN' AND escalated_at IS NOT NULL) AS disputes_decide,
         (SELECT COUNT(*) FROM disputes WHERE status = 'OPEN' AND escalated_at IS NULL) AS disputes_talking,
         (SELECT COUNT(*) FROM orders WHERE status = 'PENDING_ADMIN_REVIEW') AS stuck_orders,
         (SELECT COUNT(*) FROM orders WHERE payout_status = 'DUE') AS payouts_due,
         (SELECT COUNT(*) FROM orders WHERE refund_status = 'DUE') AS refunds_due,
         (SELECT COUNT(*) FROM products WHERE approval_status = 'FLAGGED') AS flagged_listings,
         (SELECT COUNT(*) FROM (SELECT 1 FROM reports WHERE status = 'OPEN' GROUP BY target_type, target_id) g) AS open_reports,
         (SELECT COUNT(*) FROM users WHERE flagged_at IS NOT NULL AND role <> 'admin') AS flagged_users,
         (SELECT COUNT(*) FROM suggestions WHERE status = 'NEW') AS new_messages,
         (SELECT COUNT(*) FROM orders WHERE admin_hold = true) AS held_orders`
    );
    const money = await queryOne<any>(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE status = 'COMPLETED'), 0) AS sales_completed,
         COALESCE(SUM(platform_fee) FILTER (WHERE status = 'COMPLETED'), 0) AS fees_earned,
         COALESCE(SUM(amount) FILTER (WHERE status IN ('FUNDS_SECURED', 'DISPATCHED', 'PENDING_ADMIN_REVIEW', 'DISPUTED')), 0) AS held_in_escrow,
         COUNT(*) FILTER (WHERE status = 'COMPLETED') AS orders_completed,
         COUNT(*) FILTER (WHERE status IN ('FUNDS_SECURED', 'DISPATCHED', 'PENDING_ADMIN_REVIEW', 'DISPUTED')) AS orders_in_progress
       FROM orders`
    );
    const people = await queryOne<any>(
      `SELECT (SELECT COUNT(*) FROM users WHERE role = 'customer') AS buyers,
              (SELECT COUNT(*) FROM users WHERE role = 'seller') AS sellers,
              (SELECT COUNT(*) FROM products WHERE approval_status = 'APPROVED' AND status = 'ACTIVE') AS live_listings`
    );
    return NextResponse.json({ needs, money, people, payments_paused: await paymentsPaused() });
  } catch (error) {
    return handleError(error);
  }
}
