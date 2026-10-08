'use client';

import { useEffect, useState } from 'react';

export default function AdminStuckOrders() {
  const [orders, setOrders] = useState<any[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  function load() {
    fetch('/api/admin/orders').then((response) => {
      if (response.status === 401 || response.status === 403) { window.location.href = '/admin/login'; return null; }
      return response.json();
    }).then((d) => d && setOrders(d.orders || []));
  }
  useEffect(() => {
    if (!localStorage.getItem('zemba_user')) { window.location.href = '/admin/login'; return; }
    load();
  }, []);

  async function decide(order_id: string, resolution: 'release' | 'refund') {
    const question = resolution === 'release' ? 'Pay the seller for this order?' : 'Refund the buyer for this order?';
    if (!window.confirm(question)) return;
    setBusy(order_id); setError('');
    const response = await fetch('/api/admin/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id, resolution, notes: notes[order_id] || '' }) });
    setBusy('');
    if (!response.ok) setError((await response.json().catch(() => ({}))).error || 'Could not save the decision');
    load();
  }

  const days = (date: string) => Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));

  return (
    <div className="zemba-page">
      <nav className="zemba-nav">
        <a href="/admin/dashboard" className="brand">Zemba Marketplace — Admin</a>
        <div><a href="/admin/dashboard">Overview</a><a href="/admin/payouts">Money to move</a><a href="/admin/disputes">Disputes</a><a href="/admin/messages">Messages</a><a href="/admin/users">Users</a></div>
      </nav>
      <main style={{ maxWidth: 820, margin: '1.5rem auto', padding: '0 1.5rem 4rem' }}>
        <h1 style={{ fontSize: '1.7rem' }}>Stuck orders</h1>
        <p className="zemba-muted">These orders were dispatched but the delivery window ran out before the buyer confirmed. Look at the seller&apos;s proof of dispatch and decide who gets the money.</p>
        {error && <div className="zemba-auth-error">{error}</div>}
        {orders === null && <p className="zemba-muted">Loading…</p>}
        {orders !== null && orders.length === 0 && <div className="zemba-card zemba-empty"><p>Nothing to review right now. 🎉</p></div>}
        {(orders || []).map((o) => (
          <section key={o.id} className="zemba-card" style={{ padding: '1.3rem', marginTop: '1rem' }}>
            <div className="zemba-review-top">
              <div>
                <strong>#{o.order_reference} — {o.title || 'Order'}</strong><br />
                <span className="zemba-muted">Waiting {days(o.updated_at)} days · Delivery window was {o.timeout_days} days</span>
              </div>
              <strong>K{Number(o.amount).toFixed(2)}</strong>
            </div>
            <div className="zemba-two-col" style={{ marginTop: '0.8rem' }}>
              <div><span className="zemba-muted">Seller</span><br />{o.seller_name}<br /><small className="zemba-muted">{o.seller_phone}</small></div>
              <div><span className="zemba-muted">Buyer</span><br />{o.buyer_name}<br /><small className="zemba-muted">{o.buyer_phone}</small></div>
            </div>
            <div style={{ marginTop: '0.8rem' }}>
              <span className="zemba-muted">Proof of dispatch</span><br />
              {o.waybill_image_url ? <a href={o.waybill_image_url} target="_blank" rel="noopener noreferrer"><img src={o.waybill_image_url} alt="Proof of dispatch" className="zemba-proof" /></a> : <span>No photo uploaded</span>}
            </div>
            <textarea className="zemba-input" rows={2} style={{ marginTop: '0.8rem' }} placeholder="Notes (optional, saved in the order history)" value={notes[o.id] || ''} onChange={(e) => setNotes({ ...notes, [o.id]: e.target.value })} />
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button className="zemba-btn zemba-btn-secondary zemba-danger" disabled={busy === o.id} onClick={() => decide(o.id, 'refund')}>Refund buyer</button>
              <button className="zemba-btn zemba-btn-primary" disabled={busy === o.id} onClick={() => decide(o.id, 'release')}>Pay seller</button>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
