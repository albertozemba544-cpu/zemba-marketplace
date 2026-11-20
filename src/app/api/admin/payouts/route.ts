export const dynamic = 'force-dynamic';

// "Money to move": seller payouts and buyer refunds that still have to be sent by mobile money.
// Until a payment gateway is connected, the admin sends them by hand and then marks them as paid here.

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, logEvent } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { createNotification } from '@/lib/orders';
import { fail, handleError, isUuid } from '@/lib/http';
import { SITE } from '@/lib/site';
import { cancellationRefund, fullRefund } from '@/lib/fees';
import { allocateDeductions, sellerChargeOrders, sellerChargeOwed } from '@/lib/sellerCharges';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const payoutRows = await query(
      `SELECT o.id, o.seller_id, o.order_reference, o.amount, o.platform_fee, o.net_amount, o.updated_at, p.title,
              COALESCE(s.business_name, s.full_name) AS seller_name, s.momo_provider, s.momo_number
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       JOIN users s ON s.id = o.seller_id
       WHERE o.status = 'COMPLETED' AND o.payout_status = 'DUE'
       ORDER BY o.updated_at ASC`
    );
    // refund charges owed by each seller are taken off their payouts, oldest payout first
    const deductions = new Map<string, number>();
    for (const sellerId of Array.from(new Set(payoutRows.map((o: any) => o.seller_id)))) {
      const shares = await allocateDeductions(sellerId as string);
      shares.forEach((amount, orderId) => deductions.set(orderId, amount));
    }
    const payouts = payoutRows.map((o: any) => {
      const deduction = deductions.get(o.id) || 0;
      return { ...o, deduction, pay_amount: Math.max(0, Math.round((Number(o.net_amount) - deduction) * 100) / 100) };
    });

    // sellers who still owe refund charges (admin can waive a charge)
    const sellers = await query(
      `SELECT DISTINCT o.seller_id AS id, COALESCE(s.business_name, s.full_name) AS name
       FROM orders o JOIN users s ON s.id = o.seller_id
       WHERE o.status = 'REFUNDED' AND o.seller_id IS NOT NULL AND o.updated_at >= $1::date`,
      [SITE.sellerChargesFrom]
    );
    const sellerCharges: any[] = [];
    for (const seller of sellers as any[]) {
      const owed = await sellerChargeOwed(seller.id);
      if (owed > 0) sellerCharges.push({ seller_id: seller.id, seller_name: seller.name, owed, orders: await sellerChargeOrders(seller.id) });
    }

    const refundRows = await query(
      `SELECT o.id, o.order_reference, o.amount, o.updated_at, p.title,
              b.full_name AS buyer_name, b.phone_number AS buyer_phone,
              EXISTS (SELECT 1 FROM transaction_events e WHERE e.order_id = o.id AND e.event_type = 'BUYER_CANCELLED') AS cancelled
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       JOIN users b ON b.id = o.customer_id
       WHERE o.status = 'REFUNDED' AND o.refund_status = 'DUE'
       ORDER BY o.updated_at ASC`
    );
    // a buyer who cancelled gets the item price less the cancellation fee; any other refund is in full
    const refunds = refundRows.map((o: any) => ({
      ...o,
      refund_amount: o.cancelled ? cancellationRefund(Number(o.amount)) : fullRefund(Number(o.amount)),
    }));
    const recentRows = await query(
      `SELECT o.order_reference, o.net_amount, o.amount, o.payout_status, o.payout_reference, o.payout_paid_at,
              o.refund_status, o.refund_reference, o.refund_paid_at,
              EXISTS (SELECT 1 FROM transaction_events e WHERE e.order_id = o.id AND e.event_type = 'BUYER_CANCELLED') AS cancelled,
              COALESCE((SELECT SUM((e.payload->>'amount')::numeric) FROM transaction_events e WHERE e.order_id = o.id AND e.event_type = 'SELLER_CHARGE_DEDUCTED'), 0) AS deduction
       FROM orders o
       WHERE o.payout_status = 'PAID' OR o.refund_status = 'PAID'
       ORDER BY GREATEST(o.payout_paid_at, o.refund_paid_at) DESC NULLS LAST LIMIT 30`
    );
    const recent = recentRows.map((o: any) => ({
      ...o,
      refund_amount: o.cancelled ? cancellationRefund(Number(o.amount)) : fullRefund(Number(o.amount)),
    }));
    return NextResponse.json({ payouts, refunds, recent, sellerCharges });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['admin']);
  if ('res' in auth) return auth.res;
  try {
    const { order_id, kind, reference } = await req.json();
    const ref = String(reference || '').trim().slice(0, 100);
    if (!isUuid(order_id) || !['payout', 'refund', 'waive'].includes(kind)) return fail('A valid order and type are required');

    // admin waives the refund charge on one refunded order
    if (kind === 'waive') {
      const refunded = await queryOne<{ id: string }>(
        `SELECT id FROM orders o WHERE o.id = $1 AND o.status = 'REFUNDED'
           AND NOT EXISTS (SELECT 1 FROM transaction_events e WHERE e.order_id = o.id AND e.event_type = 'SELLER_CHARGE_WAIVED')`,
        [order_id]
      );
      if (!refunded) return fail('This charge was already waived, or the order was not found', 409);
      await logEvent(order_id, 'SELLER_CHARGE_WAIVED', { admin_id: auth.user.id });
      return NextResponse.json({ ok: true });
    }

    // how much of this payout is used up by the seller's refund charges
    let deduction = 0;
    let netAmount = 0;
    if (kind === 'payout') {
      const target = await queryOne<{ seller_id: string; net_amount: number }>(
        `SELECT seller_id, net_amount FROM orders WHERE id = $1 AND status = 'COMPLETED' AND payout_status = 'DUE'`,
        [order_id]
      );
      if (target?.seller_id) {
        netAmount = Number(target.net_amount);
        deduction = (await allocateDeductions(target.seller_id)).get(order_id) || 0;
      }
    }
    const fullyOffset = kind === 'payout' && deduction > 0 && deduction >= netAmount;
    if (!ref && !fullyOffset) return fail('Enter the mobile money transaction reference so there is a record of the payment');

    const order = await queryOne<{ id: string; customer_id: string | null; seller_id: string | null }>(
      kind === 'payout'
        ? `UPDATE orders SET payout_status = 'PAID', payout_reference = $1, payout_paid_at = now()
           WHERE id = $2 AND status = 'COMPLETED' AND payout_status = 'DUE' RETURNING id, customer_id, seller_id`
        : `UPDATE orders SET refund_status = 'PAID', refund_reference = $1, refund_paid_at = now()
           WHERE id = $2 AND status = 'REFUNDED' AND refund_status = 'DUE' RETURNING id, customer_id, seller_id`,
      [ref || 'Offset against refund charges', order_id]
    );
    if (!order) return fail('This payment was already marked as sent, or the order was not found', 409);
    if (deduction > 0) await logEvent(order.id, 'SELLER_CHARGE_DEDUCTED', { amount: deduction, admin_id: auth.user.id });

    await logEvent(order.id, kind === 'payout' ? 'PAYOUT_SENT' : 'REFUND_SENT', { reference: ref || 'Offset against refund charges', admin_id: auth.user.id });
    if (kind === 'payout' && order.seller_id) await createNotification(order.id, order.seller_id, 'PAYOUT_SENT', undefined, ref).catch(() => null);
    if (kind === 'refund' && order.customer_id) await createNotification(order.id, order.customer_id, 'REFUND_SENT', undefined, ref).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
