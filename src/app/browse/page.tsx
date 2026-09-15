'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';

interface Product {
  id: string; title: string; description: string; price: number; category: string; image_url?: string | null;
}

export default function Browse() {
  const [products, setProducts] = useState<Product[]>([]);
  const [user, setUser] = useState<any>(null);
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('zemba_user');
    if (stored) setUser(JSON.parse(stored));
    fetch('/api/products').then((r) => r.json()).then((d) => setProducts(d.products));
  }, []);

  async function addToCart(productId: string) {
    if (!user) { window.location.href = '/login'; return; }
    await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: user.id, product_id: productId, quantity: 1 }),
    });
    setAdded(productId);
    setTimeout(() => setAdded(null), 1200);
  }

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <nav className="zemba-nav">
          <a href="/" className="brand">Zemba Marketplace</a>
          <div>
            <a href="/cart">Cart</a>
            {user ? <a href="/browse">Hi, {user.full_name?.split(' ')[0]}</a> : <a href="/login">Log in</a>}
          </div>
        </nav>

        <main style={{ position: 'relative', zIndex: 1, padding: '2rem 6vw 5rem' }}>
          <h1 style={{ color: '#fff', fontSize: '2rem', marginBottom: '1.5rem' }}>Browse listings</h1>
          <div className="zemba-grid">
            {products.map((p) => (
              <div key={p.id} className="zemba-card zemba-product">
                <a href={`/product/${p.id}`} className="thumb">{p.image_url ? <img src={p.image_url} alt="" /> : '🛍️'}</a>
                <h3 style={{ color: '#fff' }}><a href={`/product/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{p.title}</a></h3>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', margin: '0 0 0.4rem' }}>{p.category}</p>
                <p className="price" style={{ color: '#fff' }}>K{p.price.toFixed(2)}</p>
                <button className="zemba-btn zemba-btn-primary" style={{ width: '100%', fontSize: '0.9rem' }} onClick={() => addToCart(p.id)}>
                  {added === p.id ? 'Added ✓' : 'Add to cart'}
                </button>
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
