'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';

interface Link { id: string; product_id?: string; title: string; price: number; seller_id: string; created_at: string; }

export default function QuickPayPage() {
  const params = useParams();
  const linkId = params.linkId as string;
  const [link, setLink] = useState<Link | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!linkId) { setError('No link provided'); setLoading(false); return; }
    fetch(`/api/quick-links?link_id=${linkId}`)
      .then((r) => r.json())
      .then((data) => { if (data.link) setLink(data.link); else setError('Link expired or not found'); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [linkId]);

  async function addToCart() {
    const stored = localStorage.getItem('zemba_user');
    if (!stored) { window.location.href = '/login'; return; }
    const user = JSON.parse(stored);
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: user.id, product_id: link?.product_id || link?.id, quantity }),
    });
    if (response.ok) window.location.href = '/cart';
  }

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <nav className="zemba-nav"><a href="/" className="brand">Zemba Marketplace</a></nav>
        <main style={{ position: 'relative', zIndex: 1, maxWidth: 480, margin: '5rem auto', padding: '0 1.5rem' }}>
          <div className="zemba-card" style={{ padding: '2rem' }}>
            {loading && <p style={{ color: '#fff' }}>Loading...</p>}
            {error && <p style={{ color: '#FFD9D9' }}>⚠ {error}</p>}
            {link && (
              <>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Quick Purchase Link</p>
                <h1 style={{ color: '#fff', fontSize: '1.8rem', margin: '0.4rem 0' }}>{link.title}</h1>
                <p style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 700, margin: '1rem 0' }}>K{Number(link.price).toFixed(2)}</p>
                <label style={{ color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '0.8rem' }}>
                  Quantity
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.6rem',
                      marginTop: '0.4rem',
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      borderRadius: '4px',
                      fontSize: '1rem',
                    }}
                  />
                </label>
                <button
                  onClick={addToCart}
                  style={{
                    width: '100%',
                    padding: '0.95rem',
                    border: 0,
                    borderRadius: '4px',
                    background: '#f4bd4f',
                    color: '#112b46',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                  }}
                >
                  Add to cart — K{(Number(link.price) * quantity).toFixed(2)}
                </button>
                <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                  You will proceed to secure checkout where funds are held in escrow.
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
