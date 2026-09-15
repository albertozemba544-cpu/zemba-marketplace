'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';

export default function Cart() {
  const [items, setItems] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('zemba_user');
    if (!stored) { window.location.href = '/login'; return; }
    const u = JSON.parse(stored);
    setUser(u);
    fetch(`/api/cart?customer_id=${u.id}`).then((r) => r.json()).then((d) => setItems(d.items));
  }, []);

  async function removeItem(cartItemId: string) {
    await fetch(`/api/cart?cart_item_id=${cartItemId}`, { method: 'DELETE' });
    setItems((prev) => prev.filter((i) => i.cart_item_id !== cartItemId));
  }

  async function checkout() {
    setLoading(true);
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: user.id }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      window.location.href = `/checkout?refs=${data.references.join(',')}`;
    }
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <nav className="zemba-nav">
          <a href="/browse" className="brand">Zemba Marketplace</a>
          <div><a href="/browse">Continue browsing</a></div>
        </nav>

        <main style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '2rem auto', padding: '0 1.5rem' }}>
          <h1 style={{ color: '#fff', fontSize: '1.8rem', marginBottom: '1.2rem' }}>Your cart</h1>

          <div className="zemba-card" style={{ padding: '1.5rem' }}>
            {items.length === 0 && <p style={{ color: 'rgba(255,255,255,0.8)' }}>Your cart is empty.</p>}
            {items.map((i) => (
              <div key={i.cart_item_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                <div>
                  <div style={{ color: '#fff' }}>{i.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Qty {i.quantity} · K{i.price.toFixed(2)} each</div>
                </div>
                <button onClick={() => removeItem(i.cart_item_id)} style={{ background: 'none', border: 'none', color: '#FFD9D9', cursor: 'pointer' }}>Remove</button>
              </div>
            ))}
            {items.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', color: '#fff', fontWeight: 700 }}>
                  <span>Total</span><span>K{total.toFixed(2)}</span>
                </div>
                <button className="zemba-btn zemba-btn-primary" style={{ width: '100%', marginTop: '1.2rem' }} onClick={checkout} disabled={loading}>
                  {loading ? 'Creating escrow order…' : 'Proceed to checkout'}
                </button>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
