'use client';

import { useState } from 'react';
import ReportButton from '@/components/ReportButton';

const KIND_LABEL: Record<string, string> = {
  REFUND: 'Refund the buyer in full',
  RELEASE: 'Pay the seller and close the dispute',
  RETURN: 'The buyer returns the item, then is refunded',
};

const STAGE_LABEL: Record<string, string> = {
  NEGOTIATING: 'You are talking it through',
  RETURN_AGREED: 'Agreed: the item goes back to the seller',
  ITEM_SENT_BACK: 'The item is on its way back to the seller',
  ESCALATED: 'Zemba was asked to step in',
  RESOLVED: 'Closed',
};

const DISPUTABLE = ['FUNDS_SECURED', 'DISPATCHED', 'PENDING_ADMIN_REVIEW'];

// The whole dispute conversation: messages, proposals, sending the item back, and asking Zemba to step in.
export default function DisputePanel({ order, dispute, user, onChanged }: { order: any; dispute: any; user: any; onChanged: () => void }) {
  const isBuyer = !!user && order.customer_id === user.id;
  const isSeller = !!user && order.seller_id === user.id;
  const [reason, setReason] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState('REFUND');
  const [note, setNote] = useState('');
  const [carrier, setCarrier] = useState('');
  const [waybill, setWaybill] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function call(url: string, method: string, body: any): Promise<boolean> {
    setError('');
    setBusy(true);
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setBusy(false);
    if (response.ok) { onChanged(); return true; }
    setError((await response.json().catch(() => ({}))).error || 'Something went wrong. Please try again.');
    return false;
  }

  // ---- no dispute yet ----
  if (!dispute) {
    if (!isBuyer || !DISPUTABLE.includes(order.status)) return null;
    return (
      <div className="zemba-dispute">
        {!showForm ? (
          <>
            <p><strong>Something wrong with this order?</strong></p>
            <button type="button" className="zemba-btn zemba-btn-secondary" onClick={() => setShowForm(true)} style={{ width: '100%' }}>Open a dispute</button>
          </>
        ) : (
          <form onSubmit={async (e) => { e.preventDefault(); if (await call('/api/orders/disputes', 'POST', { order_id: order.id, reason })) { setReason(''); setShowForm(false); } }}>
            <p>Tell the seller what went wrong. You will talk it through with them first.</p>
            <textarea className="zemba-input" rows={3} required placeholder="e.g. I ordered the pink one but received the green one" value={reason} onChange={(e) => setReason(e.target.value)} />
            {error && <p className="zemba-form-error">{error}</p>}
            <button className="zemba-btn zemba-btn-primary" style={{ width: '100%' }} disabled={busy}>Open dispute</button>
            <button type="button" className="zemba-btn zemba-btn-secondary" onClick={() => setShowForm(false)} style={{ width: '100%', marginTop: '0.4rem' }}>Cancel</button>
          </form>
        )}
      </div>
    );
  }

  // ---- a dispute exists ----
  const open = dispute.status === 'OPEN';
  const proposals: any[] = dispute.proposals || [];
  const pending = proposals.find((p) => p.status === 'PENDING');
  const iProposed = pending && pending.proposed_by === user?.id;
  const otherId = isBuyer ? order.seller_id : order.customer_id;
  const held = !!order.admin_hold;
  const who = (role: string) => (role === 'customer' ? 'Buyer' : role === 'seller' ? 'Seller' : 'Zemba team');
  const ageDays = (Date.now() - new Date(dispute.created_at).getTime()) / 86_400_000;
  const declined = proposals.some((p) => p.status === 'DECLINED');
  const outcome = dispute.status === 'RESOLVED_REFUND' ? 'The buyer was refunded.' : dispute.status === 'RESOLVED_RELEASE' ? 'The payment goes to the seller.' : '';

  return (
    <div className="zemba-dispute">
      <div className="zemba-dispute-head">
        <strong>Dispute</strong>
        <span className={`zemba-pill ${open ? 'wait' : 'ok'}`}>{open ? STAGE_LABEL[dispute.stage] || 'Open' : 'Closed'}</span>
      </div>
      <p className="zemba-dispute-reason"><b>Reason:</b> {dispute.reason}</p>

      {!open && (
        <div className="zemba-legal-note">
          <strong>{outcome}</strong>
          {dispute.resolved_by === 'AGREEMENT' ? 'The buyer and seller agreed on this.' : 'The Zemba team decided this.'}
          {dispute.admin_notes ? ` ${dispute.admin_notes}` : ''}
        </div>
      )}

      {open && held && <div className="zemba-form-error">This order is on hold while Zemba checks something. No money moves until it is cleared.</div>}

      {open && (isBuyer || isSeller) && (
        <>
          <p className="zemba-muted">The quickest way to finish is to agree a solution together. Write to each other below, then propose or accept a solution.</p>

          {/* a proposal waiting for an answer */}
          {pending && (
            <div className="zemba-proposal">
              <p><b>{iProposed ? 'You proposed' : `The ${who(pending.proposer_role).toLowerCase()} proposes`}:</b> {KIND_LABEL[pending.kind]}{pending.note ? ` — “${pending.note}”` : ''}</p>
              {iProposed ? (
                <p className="zemba-muted">Waiting for the other person to answer.</p>
              ) : (
                <div className="zemba-actions">
                  <button className="zemba-btn zemba-btn-primary" disabled={busy || (held && pending.kind !== 'RETURN')} onClick={() => call('/api/orders/disputes/proposals', 'PATCH', { proposal_id: pending.id, accept: true })}>Accept</button>
                  <button className="zemba-btn zemba-btn-secondary" disabled={busy} onClick={() => call('/api/orders/disputes/proposals', 'PATCH', { proposal_id: pending.id, accept: false })}>Decline</button>
                </div>
              )}
            </div>
          )}

          {/* sending the item back */}
          {dispute.stage === 'RETURN_AGREED' && (
            isBuyer ? (
              <div className="zemba-proposal">
                <p><b>Send the item back to the seller</b>, then tell us how you sent it:</p>
                <input className="zemba-input" placeholder="Bus company or courier" value={carrier} onChange={(e) => setCarrier(e.target.value)} maxLength={100} />
                <input className="zemba-input" placeholder="Waybill or tracking number" value={waybill} onChange={(e) => setWaybill(e.target.value)} maxLength={60} />
                <button className="zemba-btn zemba-btn-primary" disabled={busy} onClick={() => call('/api/orders/disputes/return', 'POST', { dispute_id: dispute.id, action: 'sent', carrier, waybill })}>I sent it back</button>
              </div>
            ) : <p className="zemba-muted">Waiting for the buyer to send the item back.</p>
          )}
          {dispute.stage === 'ITEM_SENT_BACK' && (
            <div className="zemba-proposal">
              <p><b>The buyer sent it back</b> with {dispute.return_carrier}, waybill {dispute.return_waybill}.</p>
              {isSeller ? (
                <button className="zemba-btn zemba-btn-primary" disabled={busy || held} onClick={() => call('/api/orders/disputes/return', 'POST', { dispute_id: dispute.id, action: 'received' })}>I received it — refund the buyer</button>
              ) : <p className="zemba-muted">You are refunded as soon as the seller confirms it arrived.</p>}
            </div>
          )}

          {/* propose a solution */}
          {!['RETURN_AGREED', 'ITEM_SENT_BACK'].includes(dispute.stage) && (
            <form className="zemba-proposal" onSubmit={async (e) => { e.preventDefault(); if (await call('/api/orders/disputes/proposals', 'POST', { dispute_id: dispute.id, kind, note })) setNote(''); }}>
              <p><b>Propose a solution</b></p>
              <select className="zemba-input" value={kind} onChange={(e) => setKind(e.target.value)}>
                {Object.entries(KIND_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input className="zemba-input" placeholder="A short note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
              <button className="zemba-btn zemba-btn-secondary" disabled={busy}>Send proposal</button>
            </form>
          )}
        </>
      )}

      {/* messages */}
      <div className="zemba-dispute-messages">
        {(dispute.messages || []).length === 0 && <p className="zemba-muted">No messages yet. Say what you need.</p>}
        {(dispute.messages || []).map((m: any) => (
          <div key={m.id} className={m.sender_id === user?.id ? 'mine' : ''}>
            <strong>{m.sender_id === user?.id ? 'You' : who(m.sender_role)}</strong>
            <p>{m.message}</p>
            <small>{new Date(m.created_at).toLocaleString()}</small>
          </div>
        ))}
      </div>
      {open && (
        <form className="zemba-actions" onSubmit={async (e) => { e.preventDefault(); if (!message.trim()) return; if (await call('/api/orders/disputes/messages', 'POST', { dispute_id: dispute.id, message })) setMessage(''); }}>
          <input className="zemba-input" style={{ flex: 1, margin: 0 }} placeholder="Write a message…" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
          <button className="zemba-btn zemba-btn-primary" disabled={busy}>Send</button>
        </form>
      )}

      {error && <p className="zemba-form-error">{error}</p>}

      {/* last resort */}
      {open && (isBuyer || isSeller) && (
        dispute.escalated_at ? (
          <div className="zemba-legal-note"><strong>Zemba was asked to step in.</strong> A team member will review this. You can still agree a solution between yourselves.</div>
        ) : (
          <div className="zemba-escalate">
            <p className="zemba-muted">Cannot agree? You can ask Zemba to step in {ageDays >= 2 || declined ? 'now' : 'after 2 days, or sooner if a proposal is declined'}. Please try to agree first.</p>
            <button className="zemba-btn zemba-btn-secondary" disabled={busy} onClick={() => { if (confirm('Ask the Zemba team to step in and decide?')) call('/api/orders/disputes/escalate', 'POST', { dispute_id: dispute.id }); }}>We cannot agree — ask Zemba to step in</button>
          </div>
        )
      )}

      {(isBuyer || isSeller) && otherId && <ReportButton targetType="USER" targetId={otherId} label={isBuyer ? 'Report this seller' : 'Report this buyer'} />}
    </div>
  );
}
