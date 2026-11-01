// Dispute helpers. Buyer and seller try to agree first; the admin steps in only if they cannot.

import { logEvent, queryOne, withTransaction } from './db';
import { notifySettlement, settleOrder } from './orders';
import { notifyUser } from './notify';
import { siteUrl } from './site';

export type Outcome = 'refund' | 'release';

/** Closes a dispute and settles the order. Returns false if it was already closed. */
export async function settleDispute(disputeId: string, outcome: Outcome, by: 'AGREEMENT' | 'ADMIN', note: string): Promise<boolean> {
  const dispute = await queryOne<any>('SELECT * FROM disputes WHERE id = $1', [disputeId]);
  if (!dispute || dispute.status !== 'OPEN') return false;
  const status = outcome === 'refund' ? 'RESOLVED_REFUND' : 'RESOLVED_RELEASE';

  const settled = await withTransaction(async (client) => {
    const closed = await client.query(
      `UPDATE disputes SET status = $1, stage = 'RESOLVED', resolved_by = $2, admin_notes = $3, resolved_at = now()
       WHERE id = $4 AND status = 'OPEN' RETURNING id`,
      [status, by, note.slice(0, 2000), disputeId]
    );
    if (closed.rowCount === 0) return undefined;
    const order = await settleOrder(client, dispute.order_id, outcome);
    await logEvent(dispute.order_id, 'DISPUTE_RESOLVED', { outcome, by, note }, client);
    return order;
  });
  if (settled) await notifySettlement(settled, outcome);
  return Boolean(settled);
}

/** The dispute with the two people involved, only if this user is one of them (or an admin). */
export async function loadDisputeFor(disputeId: string, user: { id: string; role: string }) {
  const row = await queryOne<any>(
    `SELECT d.*, o.order_reference, o.customer_id, o.seller_id, o.status AS order_status, o.admin_hold
     FROM disputes d JOIN orders o ON o.id = d.order_id WHERE d.id = $1`,
    [disputeId]
  );
  if (!row) return null;
  const isBuyer = row.customer_id === user.id;
  const isSeller = row.seller_id === user.id;
  if (!isBuyer && !isSeller && user.role !== 'admin') return null;
  return { dispute: row, isBuyer, isSeller };
}

/** A message to one person about an order or dispute (email, plus SMS or WhatsApp if those are switched on). */
export async function notifyParty(orderId: string, recipientId: string | null, subject: string, message: string) {
  if (!recipientId) return;
  try {
    const row = await queryOne<any>(
      `SELECT o.order_reference, u.email, u.phone_number, u.full_name, u.role, u.whatsapp_opt_in
       FROM orders o, users u WHERE o.id = $1 AND u.id = $2`,
      [orderId, recipientId]
    );
    if (!row) return;
    const link = `${siteUrl()}/checkout/${row.order_reference}`;
    await notifyUser(
      row,
      subject,
      { title: subject, lines: [message], buttonText: 'Open the order', buttonUrl: link },
      `Zemba: ${message}`.slice(0, 300),
      { event: 'DISPUTE_UPDATE', link, order_reference: row.order_reference }
    );
  } catch (error) {
    console.error('Could not notify:', error);
  }
}
