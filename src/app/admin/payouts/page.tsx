'use client';

import { useEffect, useState } from 'react';

export default function AdminPayouts() {
  const [data, setData] = useState<any>(null);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  function load() {
    fetch('/api/admin/payouts').then((response) => {
      if (response.status === 401 || response.status === 403) { window.location.href = '/admin/login'; return null; }
      return response.json();
    }).then((d) => d && setData(d));
  }
  useEffect(() => {
    if (!localStorage.getItem('zemba_user')) { window.location.href = '/admin/login'; return; }
    load();
  }, []);

  async function markPaid(order_id: string, kind: 'payout' | 'refund') {
    setBusy(order_id); setError('');
    const response = await fetch('/api/admin/payouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id, kind, reference: refs[order_id] || '' }) });
    setBusy('');
    if (!response.ok) setError((await response.json().catch(() => ({}))).error || 'Could not save');
    else setRefs({ ...refs, [order_id]: '' });
    load();
  }

  const money = (v: number) => `K${Number(v || 0).toFixed(2)}`;
  const totalPayouts = (data?.payouts || []).reduce((sum: number, o: any) => sum + Number(o.net_amount), 0);
  const totalRefunds = (data?.refunds || []).reduce((sum: number, o: any) => sum + Number(o.amount), 0);

  return (
    <div className="zemba-page">
      <nav className="zemba-nav">
        <a href="/admin/dashboard" className="brand">Zemba Marketplace — Admin</a>
        <div><a href="/admin/dashboard">Overview</a><a href="/admin/orders">Stuck orders</a><a href="/admin/disputes">Disputes</a><a href="/admin/messages">Messages</a><a href="/admin/users">Users</a></div>
      </nav>
      <main style={{ maxWidth: 980, margin: '1.5rem auto', padding: '0 1.5rem 4rem' }}>
        <h1 style={{ fontSize: '1.7rem' }}>Money to move</h1>
        <p className="zemba-muted">Send each amount by mobile money, then type the transaction reference and press &quot;Mark as sent&quot;. The seller or buyer is told automatically and the payment is kept on record.</p>
        {error && <div className="zemba-auth-error">{error}</div>}
        {!data && <p className="zemba-muted">Loading…</p>}
        {data && (
          <>
            <div className="zemba-stats">
              <div className="zemba-card zemba-stat"><span className="zemba-muted">Seller payouts due</span><strong>{money(totalPayouts)}</strong><small className="zemba-muted">{data.payouts.length} orders</small></div>
              <div className="zemba-card zemba-stat"><span className="zemba-muted">Buyer refunds due</span><strong>{money(totalRefunds)}</strong><small className="zemba-muted">{data.refunds.length} orders</small></div>
            </div>

            <section className="zemba-card" style={{ padding: '1.2rem', marginTop: '1.2rem', overflowX: 'auto' }}>
              <h3 style={{ margin: '0 0 0.8rem' }}>Pay sellers</h3>
              <table className="zemba-table">
                <thead><tr><th>Order</th><th>Seller</th><th>Send to</th><th>Amount</th><th>Reference</th><th></th></tr></thead>
                <tbody>
                  {data.payouts.length === 0 && <tr><td colSpan={6} className="zemba-muted">No seller payouts due.</td></tr>}
                  {data.payouts.map((o: any) => (
                    <tr key={o.id}>
                      <td>#{o.order_reference}<br /><small className="zemba-muted">{o.title}</small></td>
                      <td>{o.seller_name}</td>
                      <td>{o.momo_provider} {o.momo_number}</td>
                      <td><strong>{money(o.net_amount)}</strong><br /><small className="zemba-muted">sale {money(o.amount)}, fee {money(o.platform_fee)}</small></td>
                      <td><input className="zemba-input" style={{ margin: 0, minWidth: 130 }} placeholder="MoMo ref" value={refs[o.id] || ''} onChange={(e) => setRefs({ ...refs, [o.id]: e.target.value })} /></td>
                      <td><button className="zemba-btn zemba-btn-primary" disabled={busy === o.id} onClick={() => markPaid(o.id, 'payout')}>Mark as sent</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="zemba-card" style={{ padding: '1.2rem', marginTop: '1.2rem', overflowX: 'auto' }}>
              <h3 style={{ margin: '0 0 0.8rem' }}>Refund buyers</h3>
              <table className="zemba-table">
                <thead><tr><th>Order</th><th>Buyer</th><th>Send to</th><th>Amount</th><th>Reference</th><th></th></tr></thead>
                <tbody>
                  {data.refunds.length === 0 && <tr><td colSpan={6} className="zemba-muted">No refunds due.</td></tr>}
                  {data.refunds.map((o: any) => (
                    <tr key={o.id}>
                      <td>#{o.order_reference}<br /><small className="zemba-muted">{o.title}</small></td>
                      <td>{o.buyer_name}</td>
                      <td>{o.buyer_phone}</td>
                      <td><strong>{money(o.amount)}</strong></td>
                      <td><input className="zemba-input" style={{ margin: 0, minWidth: 130 }} placeholder="MoMo ref" value={refs[o.id] || ''} onChange={(e) => setRefs({ ...refs, [o.id]: e.target.value })} /></td>
                      <td><button className="zemba-btn zemba-btn-primary" disabled={busy === o.id} onClick={() => markPaid(o.id, 'refund')}>Mark as sent</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="zemba-card" style={{ padding: '1.2rem', marginTop: '1.2rem', overflowX: 'auto' }}>
              <h3 style={{ margin: '0 0 0.8rem' }}>Recently sent</h3>
              <table className="zemba-table">
                <thead><tr><th>Order</th><th>Type</th><th>Amount</th><th>Reference</th><th>Date</th></tr></thead>
                <tbody>
                  {data.recent.length === 0 && <tr><td colSpan={5} className="zemba-muted">Nothing sent yet.</td></tr>}
                  {data.recent.map((o: any) => {
                    const refund = o.refund_status === 'PAID';
                    return (
                      <tr key={o.order_reference + (refund ? 'r' : 'p')}>
                        <td>#{o.order_reference}</td>
                        <td>{refund ? 'Refund' : 'Seller payout'}</td>
                        <td>{money(refund ? o.amount : o.net_amount)}</td>
                        <td>{refund ? o.refund_reference : o.payout_reference}</td>
                        <td>{new Date(refund ? o.refund_paid_at : o.payout_paid_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
