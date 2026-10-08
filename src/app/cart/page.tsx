'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';

const TOWNS = ['Lusaka', 'Kitwe', 'Ndola', 'Kabwe', 'Livingstone', 'Chipata', 'Kasama', 'Solwezi', 'Mansa', 'Mongu', 'Choma', 'Kapiri Mposhi', 'Mazabuka', 'Chingola', 'Mufulira', 'Luanshya', 'Kafue', 'Petauke', 'Mpika', 'Senanga'];

export default function Cart() {
  const [items, setItems] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [town, setTown] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('zemba_user');
    if (!stored) { window.location.href = '/login'; return; }
    const u = JSON.parse(stored);
    setUser(u);
    setReceiverName(u.full_name || '');
    fetch('/api/cart').then((r) => {
      if (r.status === 401 || r.status === 403) { localStorage.removeItem('zemba_user'); window.location.href = '/login'; return null; }
      return r.json();
    }).then((d) => { if (d) setItems(d.items || []); });
  }, []);

  async function removeItem(cartItemId: string) {
    await fetch(`/api/cart?cart_item_id=${cartItemId}`, { method: 'DELETE' });
    setItems((prev) => prev.filter((i) => i.cart_item_id !== cartItemId));
  }

  async function checkout(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_name: receiverName, receiver_phone: receiverPhone, delivery_town: town, delivery_note: note }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      window.location.href = `/checkout?refs=${data.references.join(',')}`;
    } else {
      setError(data.error || 'Could not create your order. Please try again.');
    }
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <nav className="zemba-nav">
          <a href="/browse" className="brand">Zemba Marketplace</a>
          <div><a href="/browse">Continue browsing</a><a href="/orders">My orders</a></div>
        </nav>

        <main style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '2rem auto', padding: '0 1.5rem 4rem' }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '1.2rem' }}>Your cart</h1>

          <div className="zemba-card" style={{ padding: '1.5rem' }}>
            {items.length === 0 && <p>Your cart is empty.</p>}
            {items.map((i) => (
              <div key={i.cart_item_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px solid #e4ece7' }}>
                <div>
                  <div>{i.title}</div>
                  <div className="zemba-muted">Qty {i.quantity} · K{i.price.toFixed(2)} each</div>
                </div>
                <button onClick={() => removeItem(i.cart_item_id)} style={{ background: 'none', border: 'none', color: '#b42318', cursor: 'pointer' }}>Remove</button>
              </div>
            ))}
            {items.length > 0 && (
              <form onSubmit={checkout}>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '1rem 0', fontWeight: 700 }}>
                  <span>Total</span><span>K{total.toFixed(2)}</span>
                </div>
                <h3 style={{ margin: '1.4rem 0 0.3rem' }}>Where should it be sent?</h3>
                <p className="zemba-muted" style={{ marginTop: 0 }}>The seller sends your item by bus or courier to this town. The bus company or courier will call this number when it arrives.</p>
                <label className="zemba-field">Name of the person collecting
                  <input className="zemba-input" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} required maxLength={120} />
                </label>
                <label className="zemba-field">Phone number for the bus company or courier
                  <input className="zemba-input" type="tel" value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} required placeholder="0971234567" maxLength={30} />
                </label>
                <label className="zemba-field">Town
                  <input className="zemba-input" list="zemba-towns" value={town} onChange={(e) => setTown(e.target.value)} required maxLength={80} placeholder="e.g. Kitwe" />
                </label>
                <datalist id="zemba-towns">{TOWNS.map((t) => <option key={t} value={t} />)}</datalist>
                <label className="zemba-field">Pickup point or landmark (optional)
                  <input className="zemba-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Mazhandu depot at the main bus station" />
                </label>
                {error && <div className="zemba-form-error">{error}</div>}
                <button className="zemba-btn zemba-btn-primary" style={{ width: '100%', marginTop: '0.4rem' }} disabled={loading}>
                  {loading ? 'Creating escrow order…' : 'Proceed to checkout'}
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
