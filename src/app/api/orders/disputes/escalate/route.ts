export const dynamic = 'force-dynamic';

// "We cannot agree": either person asks the Zemba team to step in. This is the last step, not the first.

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { alertAdmin } from '@/lib/alerts';
import { loadDisputeFor, notifyParty } from '@/lib/disputes';
import { fail, handleError, isUuid } from '@/lib/http';

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['customer', 'seller']);
  if ('res' in auth) return auth.res;
  try {
    const { dispute_id } = await req.json();
    if (!isUuid(dispute_id)) return fail('Invalid request');
    const found = await loadDisputeFor(dispute_id, auth.user);
    if (!found || (!found.isBuyer && !found.isSeller)) return fail('Dispute not found', 404);
    const { dispute, isBuyer } = found;
    if (dispute.status !== 'OPEN') return fail('This dispute is already closed', 409);
    if (dispute.escalated_at) return fail('Zemba has already been asked to step in', 409);

    const ageDays = (Date.now() - new Date(dispute.created_at).getTime()) / 86_400_000;
    const declined = await queryOne("SELECT id FROM dispute_proposals WHERE dispute_id = $1 AND status = 'DECLINED' LIMIT 1", [dispute_id]);
    if (ageDays < 2 && !declined) {
      return fail('Please try to agree with the other person first. You can ask Zemba to step in after 2 days, or sooner if a proposal was declined.', 409);
    }

    await queryOne("UPDATE disputes SET stage = 'ESCALATED', escalated_at = now() WHERE id = $1 AND status = 'OPEN'", [dispute_id]);
    await notifyParty(dispute.order_id, isBuyer ? dispute.seller_id : dispute.customer_id, 'Zemba was asked to step in', `The ${isBuyer ? 'buyer' : 'seller'} asked the Zemba team to review order #${dispute.order_reference}. You can still agree a solution between yourselves.`);
    await alertAdmin('A dispute needs a decision', `Order #${dispute.order_reference}: the buyer and seller could not agree. Open Admin -> Disputes.`).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
