'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';
import AdminNav from '@/components/AdminNav';

const kwacha = (n: number) => `K${Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminToday() {
  const [data, setData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('zemba_user');
    if (!stored || JSON.parse(stored).role !== 'admin') { window.location.href = '/admin/login'; return; }
    fetch('/api/admin/summary').then((r) => {
      if (r.status === 401 || r.status === 403) { localStorage.removeItem('zemba_user'); window.location.href = '/admin/login'; return null; }
      return r.json();
    }).then((d) => { if (d) setData(d); });
    fetch('/api/admin/overview').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setOrders((d.orders || []).slice(0, 10)); });
  }, []);

  const n = data?.needs;
  const tiles: { label: string; count: number; href: string; hint: string }[] = n ? [
    { label: 'Disputes to decide', count: n.disputes_decide, href: '/admin/disputes', hint: 'The buyer and seller asked you to step in' },
    { label: 'Stuck orders', count: n.stuck_orders, href: '/admin/orders', hint: 'The delivery window ran out' },
    { label: 'Payouts to send', count: n.payouts_due, href: '/admin/payouts', hint: 'Money owed to sellers' },
    { label: 'Refunds to send', count: n.refunds_due, href: '/admin/payouts', hint: 'Money owed to buyers' },
    { label: 'Flagged listings', count: n.flagged_listings, href: '/admin/flags', hint: 'Hidden until you check them' },
    { label: 'Reported people or listings', count: Number(n.open_reports) + Number(n.flagged_users), href: '/admin/flags', hint: 'Reported by users' },
    { label: 'New messages', count: n.new_messages, href: '/admin/messages', hint: 'From the Contact page' },
    { label: 'Orders on hold', count: n.held_orders, href: '/admin/controls', hint: 'You put these on hold' },
  ] : [];
  const urgent = tiles.reduce((sum, t) => sum + Number(t.count), 0);

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <AdminNav />
        <main style={{ maxWidth: 1000, margin: '1.5rem auto', padding: '0 1.5rem 4rem' }}>
          <h1 style={{ fontSize: '1.7rem', margin: 0 }}>Today</h1>
          {!data && <p className="zemba-muted">Loading…</p>}
          {data && (
            <>
              {data.payments_paused && <div className="zemba-form-error">Payments are PAUSED. <a href="/admin/controls">Open Controls</a> to resume.</div>}
              <p className="zemba-muted">{urgent === 0 ? 'Nothing needs you right now. Everything else runs by itself.' : 'These are the things that need a person.'}</p>
              <div className="zemba-stats">
                {tiles.map((t) => (
                  <a key={t.label} href={t.href} className={`zemba-card zemba-stat ${Number(t.count) > 0 ? 'zemba-alert' : ''}`} style={{ textDecoration: 'none' }}>
                    <span className="zemba-muted">{t.label}</span>
                    <strong>{t.count}</strong>
                    <small className="zemba-muted">{t.hint}</small>
                  </a>
                ))}
              </div>

              <h2 style={{ fontSize: '1.25rem', marginTop: '2rem' }}>Money</h2>
              <div className="zemba-stats">
                <div className="zemba-card zemba-stat"><span className="zemba-muted">Held in escrow now</span><strong>{kwacha(data.money.held_in_escrow)}</strong><small className="zemba-muted">{data.money.orders_in_progress} orders in progress</small></div>
                <div className="zemba-card zemba-stat"><span className="zemba-muted">Completed sales</span><strong>{kwacha(data.money.sales_completed)}</strong><small className="zemba-muted">{data.money.orders_completed} orders</small></div>
                <div className="zemba-card zemba-stat"><span className="zemba-muted">Zemba fees earned</span><strong>{kwacha(data.money.fees_earned)}</strong><small className="zemba-muted">From completed orders</small></div>
              </div>

              <h2 style={{ fontSize: '1.25rem', marginTop: '2rem' }}>People and shop</h2>
              <div className="zemba-stats">
                <div className="zemba-card zemba-stat"><span className="zemba-muted">Buyers</span><strong>{data.people.buyers}</strong></div>
                <div className="zemba-card zemba-stat"><span className="zemba-muted">Sellers</span><strong>{data.people.sellers}</strong></div>
                <div className="zemba-card zemba-stat"><span className="zemba-muted">Live listings</span><strong>{data.people.live_listings}</strong></div>
              </div>

              <h2 style={{ fontSize: '1.25rem', marginTop: '2rem' }}>Latest orders</h2>
              <section className="zemba-card" style={{ padding: '1rem', overflowX: 'auto' }}>
                {orders.length === 0 ? <p className="zemba-muted">No orders yet.</p> : (
                  <table className="zemba-table">
                    <thead><tr><th>Order</th><th>Item</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>{orders.map((o) => <tr key={o.id}><td>#{o.order_reference}</td><td>{o.title || '-'}</td><td>{kwacha(o.amount)}</td><td>{o.status}</td><td>{new Date(o.created_at).toLocaleDateString()}</td></tr>)}</tbody>
                  </table>
                )}
              </section>
              <p style={{ marginTop: '1.5rem' }}><a href="/api/admin/backup">Download a backup of your data</a></p>
            </>
          )}
        </main>
      </div>
    </>
  );
}
