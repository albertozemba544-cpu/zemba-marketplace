export const dynamic = 'force-dynamic';

// Buyer and seller agree a solution to a dispute between themselves.
//   POST  -> one of them proposes a solution
//   PATCH -> the OTHER one accepts or declines it

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { loadDisputeFor, notifyParty, settleDispute } from '@/lib/disputes';
import { moneyBlockReason } from '@/lib/settings';
import { fail, handleError, isUuid } from '@/lib/http';

const KINDS = ['REFUND', 'RELEASE', 'RETURN'];
const KIND_TEXT: Record<string, string> = {
  REFUND: 'refund the buyer in full',
  RELEASE: 'pay the seller and close the dispute',
  RETURN: 'the buyer returns the item and is then refunded',
};

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, ['customer', 'seller']);
  if ('res' in auth) return auth.res;
  try {
    const { dispute_id, kind, note } = await req.json();
    if (!isUuid(dispute_id) || !KINDS.includes(kind)) return fail('Choose a solution to propose');
    const found = await loadDisputeFor(dispute_id, auth.user);
    if (!found || (!found.isBuyer && !found.isSeller)) return fail('Dispute not found', 404);
    const { dispute, isBuyer } = found;
    if (dispute.status !== 'OPEN') return fail('This dispute is already closed', 409);
    if (dispute.stage === 'RETURN_AGREED' || dispute.stage === 'ITEM_SENT_BACK') return fail('You already agreed that the item is sent back. Finish that step first.', 409);

    await queryOne("UPDATE dispute_proposals SET status = 'SUPERSEDED', responded_at = now() WHERE dispute_id = $1 AND status = 'PENDING'", [dispute_id]);
    await queryOne(
      'INSERT INTO dispute_proposals (dispute_id, proposed_by, kind, note) VALUES ($1, $2, $3, $4)',
      [dispute_id, auth.user.id, kind, String(note || '').trim().slice(0, 500) || null]
    );
    const other = isBuyer ? dispute.seller_id : dispute.customer_id;
    await notifyParty(dispute.order_id, other, 'A solution was proposed', `The ${isBuyer ? 'buyer' : 'seller'} proposes: ${KIND_TEXT[kind]}. Please open the order to accept or decline.`);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser(req, ['customer', 'seller']);
  if ('res' in auth) return auth.res;
  try {
    const { proposal_id, accept } = await req.json();
    if (!isUuid(proposal_id) || typeof accept !== 'boolean') return fail('Invalid request');
    const proposal = await queryOne<any>('SELECT * FROM dispute_proposals WHERE id = $1', [proposal_id]);
    if (!proposal) return fail('Proposal not found', 404);
    const found = await loadDisputeFor(proposal.dispute_id, auth.user);
    if (!found || (!found.isBuyer && !found.isSeller)) return fail('Dispute not found', 404);
    const { dispute, isBuyer } = found;
    if (proposal.proposed_by === auth.user.id) return fail('The other person has to answer your proposal', 403);
    if (proposal.status !== 'PENDING') return fail('This proposal is no longer open', 409);
    if (dispute.status !== 'OPEN') return fail('This dispute is already closed', 409);

    const proposerId = proposal.proposed_by as string;
    if (!accept) {
      await queryOne("UPDATE dispute_proposals SET status = 'DECLINED', responded_at = now() WHERE id = $1 AND status = 'PENDING'", [proposal_id]);
      await notifyParty(dispute.order_id, proposerId, 'Your proposal was declined', `The ${isBuyer ? 'buyer' : 'seller'} declined your proposal for order #${dispute.order_reference}. You can send a message or propose something else.`);
      return NextResponse.json({ ok: true, declined: true });
    }

    if (proposal.kind !== 'RETURN') {
      const blocked = await moneyBlockReason(dispute.order_id);
      if (blocked) return fail(blocked, 503);
    }
    const taken = await queryOne("UPDATE dispute_proposals SET status = 'ACCEPTED', responded_at = now() WHERE id = $1 AND status = 'PENDING' RETURNING id", [proposal_id]);
    if (!taken) return fail('This proposal is no longer open', 409);

    if (proposal.kind === 'RETURN') {
      await queryOne("UPDATE disputes SET stage = 'RETURN_AGREED' WHERE id = $1 AND status = 'OPEN'", [dispute.id]);
      await notifyParty(dispute.order_id, dispute.customer_id, 'Send the item back', `Both of you agreed that the item goes back to the seller. Please send it back and enter the bus or courier details on the order page. You are refunded once the seller confirms it arrived.`);
      await notifyParty(dispute.order_id, dispute.seller_id, 'The item will be sent back', `Both of you agreed that the buyer sends the item back. When it arrives, confirm it on the order page and the buyer is refunded.`);
      return NextResponse.json({ ok: true, stage: 'RETURN_AGREED' });
    }

    const outcome = proposal.kind === 'REFUND' ? 'refund' : 'release';
    const done = await settleDispute(dispute.id, outcome, 'AGREEMENT', 'Buyer and seller agreed on this solution.');
    return NextResponse.json({ ok: done, resolved: done });
  } catch (error) {
    return handleError(error);
  }
}
