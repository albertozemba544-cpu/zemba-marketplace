'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';

export default function NewListing() {
  const [user, setUser] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('1');
  const [image, setImage] = useState<File | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('zemba_user');
    if (!stored) { window.location.href = '/seller/login'; return; }
    setUser(JSON.parse(stored));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = new FormData();
    form.set('seller_id', user.id);
    form.set('title', title);
    form.set('description', description);
    form.set('price', price);
    form.set('category', category);
    form.set('stock', stock);
    if (image) form.set('image', image);

    const response = await fetch('/api/products', {
      method: 'POST',
      body: form,
    });
    if (!response.ok) { setError((await response.json()).error || 'Could not publish listing'); return; }
    setSaved(true);
    setTimeout(() => { window.location.href = '/seller/dashboard'; }, 900);
  }

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <nav className="zemba-nav"><a href="/seller/dashboard" className="brand">Zemba Marketplace — Seller</a></nav>
        <main style={{ position: 'relative', zIndex: 1, maxWidth: 480, margin: '2rem auto', padding: '0 1.5rem' }}>
          <div className="zemba-card" style={{ padding: '2rem' }}>
            <h1 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '1.2rem' }}>New listing</h1>
            <form onSubmit={handleSubmit}>
              <input className="zemba-input" placeholder="Item title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <input className="zemba-input" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
              <input className="zemba-input" type="number" placeholder="Price (ZMW)" value={price} onChange={(e) => setPrice(e.target.value)} required />
              <input className="zemba-input" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
              <input className="zemba-input" type="number" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)} />
              <input className="zemba-input" type="file" accept="image/jpeg,image/png" onChange={(e) => setImage(e.target.files?.[0] || null)} />
              {error && <div className="zemba-auth-error">{error}</div>}
              <button className="zemba-btn zemba-btn-primary" style={{ width: '100%' }}>{saved ? 'Saved ✓' : 'Publish listing'}</button>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
