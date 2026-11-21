'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';
import { SITE } from '@/lib/site';
import { buyerProtectionFee, kwacha, meetsMinimumOrder } from '@/lib/fees';
import { ShippingConfig, shippingFor } from '@/lib/shipping';
import { ZAMBIA_TOWNS } from '@/lib/towns';


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

  // each product in the cart becomes its own order, so the minimum, the shipping and the buyer protection fee apply to each one
  const FREE: ShippingConfig = { mode: 'FREE', otherPrice: null, rates: [] };
  const lines = items.map((i) => {
    const total = Math.round(i.price * i.quantity * 100) / 100;
    const quote = shippingFor((i.shipping as ShippingConfig) ?? FREE, town);
    const shipping = quote.available ? quote.price : 0;
    return { item: i, total, quote, shipping, fee: buyerProtectionFee(total, shipping) };
  });
  const itemsTotal = lines.reduce((sum, l) => sum + l.total, 0);
  const shippingTotal = lines.reduce((sum, l) => sum + l.shipping, 0);
  const protectionTotal = lines.reduce((sum, l) => sum + l.fee, 0);
  const total = Math.round((itemsTotal + shippingTotal + protectionTotal) * 100) / 100;
  const belowMinimum = lines.filter((l) => !meetsMinimumOrder(l.total));
  const needsTown = town.trim() === '' && lines.some((l) => l.item.shipping?.mode === 'BY_TOWN');
  const undeliverable = town.trim() === '' ? [] : lines.filter((l) => !l.quote.available);

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <nav className="zemba-nav">
          <a href="/browse" className="brand">Zemba Marketplace</a>
          <div><a href="/browse">Continue browsing</a><a href="/orders">My orders</a><a href="/messages">Messages</a></div>
        </nav>

        <main style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '2rem auto', padding: '0 1.5rem 4rem' }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '1.2rem' }}>Your cart</h1>

          <div className="zemba-card" style={{ padding: '1.5rem' }}>
            {items.length === 0 && <p>Your cart is empty.</p>}
            {items.map((i) => (
              <div key={i.cart_item_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px solid #e4ece7' }}>
                <div>
                  <div>{i.title}</div>
                  <div className="zemba-muted">Qty {i.quantity} · K{i.price.toFixed(2)} each{i.shipping?.mode === 'BY_TOWN' ? ' · shipping depends on your town' : ' · free shipping'}</div>
                </div>
                <button onClick={() => removeItem(i.cart_item_id)} style={{ background: 'none', border: 'none', color: '#b42318', cursor: 'pointer' }}>Remove</button>
              </div>
            ))}
            {items.length > 0 && (
              <form onSubmit={checkout}>
                <h3 style={{ margin: '1.2rem 0 0.3rem' }}>Where should it be sent?</h3>
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
                <datalist id="zemba-towns">{ZAMBIA_TOWNS.map((t) => <option key={t} value={t} />)}</datalist>
                <label className="zemba-field">Pickup point or landmark (optional)
                  <input className="zemba-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Mazhandu depot at the main bus station" />
                </label>

                <div style={{ margin: '1.2rem 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Items</span><span>K{itemsTotal.toFixed(2)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Shipping</span><span>{needsTown ? 'Choose your town' : shippingTotal === 0 ? 'Free' : `K${shippingTotal.toFixed(2)}`}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Buyer protection fee</span><span>K{protectionTotal.toFixed(2)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid #e4ece7' }}><span>Total to pay</span><span>K{total.toFixed(2)}</span></div>
                  <p className="zemba-muted" style={{ marginBottom: 0 }}>You pay for the items, the shipping and the buyer protection fee together, in one payment. The shipping price is set by each seller for your town. The buyer protection fee is {SITE.buyerFeePercent}% of the item price plus shipping (minimum {kwacha(SITE.buyerFeeMin)} per order). It covers escrow protection, dispute help and refunds. Each item is a separate order of at least {kwacha(SITE.minOrder)}.</p>
                  {belowMinimum.length > 0 && (
                    <div className="zemba-form-error" style={{ marginTop: '0.8rem' }}>
                      The minimum order is {kwacha(SITE.minOrder)} per item. Please increase the quantity of: {belowMinimum.map((l) => l.item.title).join(', ')}.
                    </div>
                  )}
                  {undeliverable.length > 0 && (
                    <div className="zemba-form-error" style={{ marginTop: '0.8rem' }}>
                      The seller does not deliver to {town.trim()} for: {undeliverable.map((l) => l.item.title).join(', ')}. Please choose another town or remove the item.
                    </div>
                  )}
                </div>
                {error && <div className="zemba-form-error">{error}</div>}
                <button className="zemba-btn zemba-btn-primary" style={{ width: '100%', marginTop: '0.4rem' }} disabled={loading || belowMinimum.length > 0 || undeliverable.length > 0}>
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
