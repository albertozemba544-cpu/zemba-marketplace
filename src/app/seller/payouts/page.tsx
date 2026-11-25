'use client';

import { useEffect, useState } from 'react';
import { statusInfo } from '@/lib/status';

export default function SellerPayouts() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('zemba_user');
    if (!stored || JSON.parse(stored).role !== 'seller') { window.location.href = '/seller/login'; return; }
    fetch('/api/seller/payouts').then((response) => {
      if (response.status === 401 || response.status === 403) { window.location.href = '/seller/login'; return null; }
      return response.json();
    }).then((d) => d && setData(d));
  }, []);

  const money = (value: number) => `K${Number(value || 0).toFixed(2)}`;
  const payoutLabel = (o: any) => (o.payout_status === 'PAID' ? { label: 'Paid', tone: 'ok' } : (o.payout_status === 'DUE' || o.payout_status === 'PROCESSING' || o.payout_status === 'FAILED') ? { label: 'Payout being sent', tone: 'wait' } : o.status === 'REFUNDED' ? { label: 'Refunded to buyer', tone: 'bad' } : { label: 'After delivery is confirmed', tone: 'info' });

  return (
    <div className="zemba-page">
      <nav className="zemba-nav"><a href="/seller/dashboard" className="brand">Zemba Marketplace — Seller</a><div><a href="/seller/dashboard">Dashboard</a><a href="/seller/listings/new">New listing</a></div></nav>
      <main style={{ maxWidth: 900, margin: '1.5rem auto', padding: '0 1.5rem 4rem' }}>
        <h1 style={{ fontSize: '1.7rem' }}>Payouts</h1>
        {data?.payout_to?.number && <p className="zemba-muted">Payouts go to your {data.payout_to.provider} number {data.payout_to.number}.</p>}
        {!data && <p className="zemba-muted">Loading…</p>}
        {data && (
          <>
            <div className="zemba-stats">
              <div className="zemba-card zemba-stat"><span className="zemba-muted">Held in escrow</span><strong>{money(data.summary.in_escrow)}</strong><small className="zemba-muted">Paid by buyers, waiting for delivery</small></div>
              <div className="zemba-card zemba-stat"><span className="zemba-muted">Payout being sent</span><strong>{money(data.summary.awaiting)}</strong><small className="zemba-muted">Delivery confirmed</small></div>
              <div className="zemba-card zemba-stat"><span className="zemba-muted">Paid to you</span><strong>{money(data.summary.paid)}</strong><small className="zemba-muted">Total received</small></div>
            </div>
            {Number(data.charges_owed) > 0 && (
              <div className="zemba-card" style={{ padding: '1rem 1.2rem', marginTop: '1.2rem' }}>
                <strong>Refund charges to be deducted: {money(data.charges_owed)}</strong>
                <p className="zemba-muted" style={{ margin: '0.3rem 0 0' }}>When an order is refunded because the seller did not send it, or sent something that was not as described, a small charge covers the cost of that refund. It is taken off your next payouts automatically. See the Terms of Use for details.</p>
              </div>
            )}
            <section className="zemba-card" style={{ padding: '1.2rem', marginTop: '1.2rem', overflowX: 'auto' }}>
              <h3 style={{ margin: '0 0 0.8rem' }}>Order history</h3>
              <table className="zemba-table">
                <thead><tr><th>Order</th><th>Item</th><th>Sale</th><th>Fee</th><th>You receive</th><th>Status</th><th>Reference</th></tr></thead>
                <tbody>
                  {data.orders.length === 0 && <tr><td colSpan={7} className="zemba-muted">No paid orders yet.</td></tr>}
                  {data.orders.map((o: any) => {
                    const info = payoutLabel(o);
                    return (
                      <tr key={o.order_reference}>
                        <td>#{o.order_reference}<br /><small className="zemba-muted">{new Date(o.updated_at).toLocaleDateString()}</small></td>
                        <td>{o.title || '-'}</td>
                        <td>{money(o.amount)}</td>
                        <td>{money(o.platform_fee)}</td>
                        <td><strong>{money(Number(o.net_amount) - Number(o.deduction || 0))}</strong>{Number(o.deduction) > 0 && <><br /><small className="zemba-muted">after {money(o.deduction)} refund charges</small></>}</td>
                        <td><span className={`zemba-pill ${info.tone}`}>{info.label}</span><br /><small className="zemba-muted">{statusInfo(o.status).label}</small></td>
                        <td>{o.payout_reference || '-'}</td>
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
