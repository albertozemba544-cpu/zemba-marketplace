'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';

export default function SellerDashboard() {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [carriers, setCarriers] = useState<{ id: string; name: string }[]>([]);
  const [quickLinkTitle, setQuickLinkTitle] = useState('');
  const [quickLinkPrice, setQuickLinkPrice] = useState('');
  const [generatedLink, setGeneratedLink] = useState<{ url: string; id: string } | null>(null);
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('zemba_user');
    if (!stored) { window.location.href = '/seller/login'; return; }
    const u = JSON.parse(stored);
    if (u.role !== 'seller') { window.location.href = '/seller/login'; return; }
    setUser(u);
    fetch(`/api/products?seller_id=${u.id}`).then((r) => r.json()).then((d) => setProducts(d.products || []));
    fetch('/api/orders').then((r) => r.json()).then((d) => setOrders(d.orders || []));
    fetch('/api/carriers').then((r) => r.json()).then((d) => setCarriers(d.carriers || []));
  }, []);

  async function dispatchOrder(event: React.FormEvent<HTMLFormElement>, orderId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set('order_id', orderId);
    const choice = String(form.get('carrier_choice') || '');
    form.set('carrier_name', choice === '__other' ? String(form.get('carrier_other') || '') : choice);
    form.set('seller_id', user.id);
    const response = await fetch('/api/orders/dispatch', { method: 'POST', body: form });
    if (response.ok) {
      setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status: 'DISPATCHED' } : order));
      setDispatching(null);
    } else alert((await response.json().catch(() => ({}))).error || 'Could not mark as dispatched');
  }

  async function generateQuickLink(event: React.FormEvent) {
    event.preventDefault();
    if (!quickLinkTitle || !quickLinkPrice) { setLinkError('Title and price required'); return; }
    setLinkError('');
    const response = await fetch('/api/quick-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seller_id: user.id, title: quickLinkTitle, price: Number(quickLinkPrice) }),
    });
    const data = await response.json();
    if (response.ok) { setGeneratedLink({ url: data.share_url, id: data.link_id }); setQuickLinkTitle(''); setQuickLinkPrice(''); }
    else setLinkError(data.error);
  }

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <nav className="zemba-nav">
          <span className="brand">Zemba Marketplace — Seller</span>
          <div><a href="/seller/listings/new">New listing</a><a href="/seller/payouts">Payouts</a><a href="/seller/verify">Get verified</a><a href="/account">Account</a><a href="/help">Help</a></div>
        </nav>

        <main style={{ position: 'relative', zIndex: 1, maxWidth: 760, margin: '1rem auto', padding: '0 1.5rem 4rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.85)' }}>{user?.business_name || user?.full_name}</p>

          <section className="zemba-card" style={{ padding: '1.5rem', marginTop: '1rem', background: 'rgba(244, 189, 79, 0.1)', border: '1px solid #f4bd4f' }}>
            <h3 style={{ color: '#f4bd4f', margin: '0 0 0.8rem' }}>🚀 Generate Social Share Link</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: '0 0 1rem' }}>Create instant payment links to share on Facebook, Instagram, or WhatsApp</p>
            <form onSubmit={generateQuickLink}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.8rem', alignItems: 'flex-end' }}>
                <label style={{ color: 'rgba(255,255,255,0.8)', display: 'block' }}>
                  Item name
                  <input
                    type="text"
                    value={quickLinkTitle}
                    onChange={(e) => setQuickLinkTitle(e.target.value)}
                    placeholder="e.g., Red T-Shirt Size L"
                    style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.3rem', border: '1px solid #f4bd4f', background: 'rgba(255,255,255,0.05)', color: '#fff', borderRadius: '4px', fontSize: '0.9rem' }}
                  />
                </label>
                <label style={{ color: 'rgba(255,255,255,0.8)', display: 'block' }}>
                  Price (K)
                  <input
                    type="number"
                    value={quickLinkPrice}
                    onChange={(e) => setQuickLinkPrice(e.target.value)}
                    placeholder="e.g., 99.99"
                    step="0.01"
                    min="0"
                    style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.3rem', border: '1px solid #f4bd4f', background: 'rgba(255,255,255,0.05)', color: '#fff', borderRadius: '4px', fontSize: '0.9rem' }}
                  />
                </label>
                <button className="zemba-btn zemba-btn-primary" type="submit" style={{ height: '2.35rem' }}>Generate</button>
              </div>
              {linkError && <p style={{ color: '#FFD9D9', fontSize: '0.85rem', marginTop: '0.5rem' }}>⚠ {linkError}</p>}
            </form>
            {generatedLink && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid rgba(244,189,79,0.3)' }}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>Your link is ready! Copy and share:</p>
                <code style={{ display: 'block', color: '#f4bd4f', fontSize: '0.8rem', wordBreak: 'break-all', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '3px', marginBottom: '0.8rem' }}>{generatedLink.url}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(generatedLink.url); alert('Link copied!'); }}
                  style={{ padding: '0.5rem 1rem', background: 'rgba(244,189,79,0.2)', color: '#f4bd4f', border: '1px solid #f4bd4f', borderRadius: '3px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  📋 Copy Link
                </button>
              </div>
            )}
          </section>

          <section className="zemba-card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
            <h3 style={{ color: '#fff', margin: '0 0 0.8rem' }}>Your listings</h3>
            <table className="zemba-table">
              <thead><tr><th>Title</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {products.length === 0 && <tr><td colSpan={5} style={{ color: 'rgba(255,255,255,0.6)' }}>No listings yet.</td></tr>}
                {products.map((p) => (
                  <tr key={p.id}><td>{p.title}</td><td>K{p.price}</td><td>{p.stock}</td><td><span className={`zemba-pill ${p.approval_status === 'APPROVED' ? (p.status === 'ACTIVE' ? 'ok' : 'info') : p.approval_status === 'REJECTED' ? 'bad' : 'wait'}`}>{p.approval_status === 'APPROVED' ? (p.status === 'ACTIVE' ? 'Live' : 'Paused') : p.approval_status === 'REJECTED' ? 'Not approved' : 'Awaiting approval'}</span></td><td><a href={`/seller/listings/${p.id}/edit`} className="zemba-btn zemba-btn-secondary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}>Edit</a></td></tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="zemba-card" style={{ padding: '1.5rem', marginTop: '1.2rem' }}>
            <h3 style={{ color: '#fff', margin: '0 0 0.8rem' }}>Orders</h3>
            <table className="zemba-table">
              <thead><tr><th>Reference</th><th>Amount</th><th>You receive</th><th>Status</th><th>Dispatch</th></tr></thead>
              <tbody>
                {orders.length === 0 && <tr><td colSpan={5} style={{ color: 'rgba(255,255,255,0.6)' }}>No orders yet.</td></tr>}
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.order_reference}{o.delivery_town && <><br /><small className="zemba-muted">Send to: {o.receiver_name}, {o.receiver_phone}<br />Town: {o.delivery_town}{o.delivery_note ? ` — ${o.delivery_note}` : ''}</small></>}{o.carrier_name && <><br /><small className="zemba-muted">{o.carrier_name} · waybill {o.waybill_number}</small></>}</td><td>K{o.amount}</td><td>K{o.net_amount}</td><td>{o.status}</td>
                    <td>{o.status === 'FUNDS_SECURED' && (dispatching === o.id ? (
                      <form className="zemba-dispatch-form" onSubmit={(event) => dispatchOrder(event, o.id)}>
                        <select className="zemba-input" name="carrier_choice" required defaultValue="" onChange={(event) => { const box = event.currentTarget.form?.elements.namedItem('carrier_other') as HTMLInputElement | null; if (box) box.style.display = event.currentTarget.value === '__other' ? 'block' : 'none'; }}>
                          <option value="" disabled>Bus company or courier</option>
                          {carriers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                          <option value="__other">Other (type the name)</option>
                        </select>
                        <input className="zemba-input" name="carrier_other" placeholder="Name of the bus company or courier" style={{ display: 'none' }} />
                        <input className="zemba-input" name="waybill_number" placeholder="Waybill / tracking number" required maxLength={60} />
                        <input className="zemba-input" name="pickup_point" placeholder="Where the buyer collects it (e.g. Mazhandu depot, Kitwe)" required maxLength={200} />
                        <label className="zemba-muted">Days it should take to arrive<input className="zemba-input" name="transit_days" type="number" min="1" max="60" defaultValue="5" aria-label="Transit days" /></label>
                        <label className="zemba-muted">Photo of the waybill or receipt<input className="zemba-input" name="proof" type="file" accept="image/jpeg,image/png" required aria-label="Proof of dispatch" /></label>
                        <button className="zemba-btn zemba-btn-primary" type="submit">Submit</button>
                      </form>
                    ) : <button className="zemba-btn zemba-btn-secondary" type="button" onClick={() => setDispatching(o.id)}>Mark as dispatched</button>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </main>
      </div>
    </>
  );
}
