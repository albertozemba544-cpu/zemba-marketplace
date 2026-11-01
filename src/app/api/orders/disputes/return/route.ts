export const dynamic = 'force-dynamic';

// The "send it back" steps of a dispute: the buyer says it was sent, the seller says it arrived.

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { loadDisputeFor, notifyParty, settleDispute } from '@/lib/disputes';
import { moneyBlockReason } from '@/lib/settings';
import { fail, handleError, isUuid } from '@/lib/http';

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['customer', 'seller']);
  if ('res' in auth) return auth.res;
  try {
    const { dispute_id, action, carrier, waybill } = await req.json();
    if (!isUuid(dispute_id) || !['sent', 'received'].includes(action)) return fail('Invalid request');
    const found = await loadDisputeFor(dispute_id, auth.user);
    if (!found || (!found.isBuyer && !found.isSeller)) return fail('Dispute not found', 404);
    const { dispute, isBuyer, isSeller } = found;
    if (dispute.status !== 'OPEN') return fail('This dispute is already closed', 409);

    if (action === 'sent') {
      if (!isBuyer) return fail('Only the buyer can say the item was sent back', 403);
      if (dispute.stage !== 'RETURN_AGREED') return fail('You have not agreed to send the item back yet', 409);
      const company = String(carrier || '').trim();
      const number = String(waybill || '').trim();
      if (company.length < 2 || company.length > 100) return fail('Enter the bus company or courier you used');
      if (number.length < 3 || number.length > 60) return fail('Enter the waybill or tracking number');
      await queryOne(
        "UPDATE disputes SET stage = 'ITEM_SENT_BACK', return_carrier = $1, return_waybill = $2, return_sent_at = now() WHERE id = $3 AND status = 'OPEN'",
        [company, number, dispute.id]
      );
      await notifyParty(dispute.order_id, dispute.seller_id, 'The buyer sent the item back', `The buyer says the item was sent back with ${company}, waybill ${number}. When it arrives, confirm it on the order page and the buyer is refunded.`);
      return NextResponse.json({ ok: true });
    }

    if (!isSeller) return fail('Only the seller can confirm that the item arrived', 403);
    if (dispute.stage !== 'ITEM_SENT_BACK') return fail('The buyer has not said the item was sent back yet', 409);
    const blocked = await moneyBlockReason(dispute.order_id);
    if (blocked) return fail(blocked, 503);
    await queryOne('UPDATE disputes SET return_received_at = now() WHERE id = $1', [dispute.id]);
    const done = await settleDispute(dispute.id, 'refund', 'AGREEMENT', 'The item was returned and the seller confirmed receiving it.');
    return NextResponse.json({ ok: done, resolved: done });
  } catch (error) {
    return handleError(error);
  }
}
