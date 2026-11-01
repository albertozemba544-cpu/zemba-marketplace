'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';
import AdminNav from '@/components/AdminNav';

const KIND_LABEL: Record<string, string> = { REFUND: 'refund the buyer', RELEASE: 'pay the seller', RETURN: 'buyer returns the item, then refund' };

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'decide' | 'talking' | 'closed'>('decide');
  const [error, setError] = useState('');

  function load() {
    fetch('/api/admin/disputes').then((r) => {
      if (r.status === 401 || r.status === 403) { window.location.href = '/admin/login'; return null; }
      return r.json();
    }).then((d) => { if (d) setDisputes(d.disputes || []); });
  }
  useEffect(load, []);

  async function resolve(dispute_id: string, resolution: 'refund' | 'release') {
    setError('');
    const response = await fetch('/api/admin/disputes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dispute_id, resolution, admin_notes: notes[dispute_id] || '' }) });
    if (!response.ok) setError((await response.json().catch(() => ({}))).error || 'Could not resolve the dispute');
    load();
  }

  const decide = disputes.filter((d) => d.status === 'OPEN' && d.escalated_at);
  const talking = disputes.filter((d) => d.status === 'OPEN' && !d.escalated_at);
  const closed = disputes.filter((d) => d.status !== 'OPEN');
  const shown = tab === 'decide' ? decide : tab === 'talking' ? talking : closed;

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <AdminNav />
        <main style={{ maxWidth: 820, margin: '1.5rem auto', padding: '0 1.5rem 4rem' }}>
          <h1 style={{ fontSize: '1.7rem', margin: 0 }}>Disputes</h1>
          <p className="zemba-muted">Buyers and sellers settle disputes between themselves. You decide only when they ask Zemba to step in (or after 7 days without agreement).</p>
          <div className="zemba-tabs">
            <button className={tab === 'decide' ? 'active' : ''} onClick={() => setTab('decide')}>Needs your decision ({decide.length})</button>
            <button className={tab === 'talking' ? 'active' : ''} onClick={() => setTab('talking')}>They are talking ({talking.length})</button>
            <button className={tab === 'closed' ? 'active' : ''} onClick={() => setTab('closed')}>Closed ({closed.length})</button>
          </div>
          {error && <div className="zemba-form-error">{error}</div>}
          {shown.length === 0 && <p className="zemba-muted">Nothing here.</p>}
          {shown.map((d) => (
            <div key={d.id} className="zemba-card zemba-flag-card">
              <div>
                <strong>Order #{d.order_reference}</strong> — K{Number(d.amount).toFixed(2)} <span className={`zemba-pill ${d.status === 'OPEN' ? 'wait' : 'ok'}`}>{d.status === 'OPEN' ? d.stage : d.status}</span>
                {d.admin_hold && <span className="zemba-pill bad" style={{ marginLeft: 6 }}>On hold</span>}
                <p className="zemba-muted" style={{ margin: '0.4rem 0' }}><b>Reason:</b> {d.reason}</p>
                {d.return_waybill && <p className="zemba-muted">Item sent back with {d.return_carrier}, waybill {d.return_waybill}{d.return_received_at ? ' (seller confirmed)' : ''}.</p>}
                {d.proposals.length > 0 && (
                  <div className="zemba-dispute-messages">
                    {d.proposals.map((p: any, i: number) => <div key={i}><strong>{p.proposer_role === 'customer' ? 'Buyer' : 'Seller'} proposed</strong><p>{KIND_LABEL[p.kind]}{p.note ? ` — “${p.note}”` : ''} <em>({p.status.toLowerCase()})</em></p></div>)}
                  </div>
                )}
                <div className="zemba-dispute-messages">
                  {d.messages.length === 0 && <p className="zemba-muted">No messages.</p>}
                  {d.messages.map((m: any) => <div key={m.id}><strong>{m.full_name} ({m.sender_role})</strong><p>{m.message}</p></div>)}
                </div>
                {d.status !== 'OPEN' && <p className="zemba-muted">{d.resolved_by === 'AGREEMENT' ? 'Settled by the buyer and seller.' : 'Decided by the Zemba team.'} {d.admin_notes || ''}</p>}
              </div>
              {d.status === 'OPEN' && (
                <>
                  <textarea className="zemba-input" rows={2} placeholder="Your decision and reason (both people see it)" value={notes[d.id] || ''} onChange={(e) => setNotes({ ...notes, [d.id]: e.target.value })} />
                  <div className="zemba-actions">
                    <button className="zemba-btn zemba-btn-secondary" onClick={() => resolve(d.id, 'refund')}>Refund the buyer</button>
                    <button className="zemba-btn zemba-btn-primary" onClick={() => resolve(d.id, 'release')}>Pay the seller</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </main>
      </div>
    </>
  );
}
