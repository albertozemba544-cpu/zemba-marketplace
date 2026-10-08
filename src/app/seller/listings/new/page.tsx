'use client';

import { useEffect, useState } from 'react';
import { shrinkImage } from '@/lib/imageResize';

const MAX_PHOTOS = 5;

export default function NewListing() {
  const [user, setUser] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('1');
  const [images, setImages] = useState<File[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('zemba_user');
    if (!stored) { window.location.href = '/seller/login'; return; }
    setUser(JSON.parse(stored));
  }, []);

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const chosen = Array.from(list).slice(0, Math.max(MAX_PHOTOS - images.length, 0));
    const shrunk = await Promise.all(chosen.map((file) => shrinkImage(file)));
    setImages((current) => [...current, ...shrunk]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData();
    form.set('title', title);
    form.set('description', description);
    form.set('price', price);
    form.set('category', category);
    form.set('stock', stock);
    images.forEach((file) => form.append('images', file));

    const response = await fetch('/api/products', { method: 'POST', body: form });
    setSaving(false);
    if (!response.ok) { setError((await response.json().catch(() => ({}))).error || 'Could not publish listing'); return; }
    setError('');
    setSaved(true);
    setTimeout(() => { window.location.href = '/seller/dashboard'; }, 900);
  }

  return (
    <div className="zemba-page">
      <nav className="zemba-nav"><a href="/seller/dashboard" className="brand">Zemba Marketplace — Seller</a></nav>
      <main style={{ maxWidth: 520, margin: '2rem auto', padding: '0 1.5rem 4rem' }}>
        <div className="zemba-card" style={{ padding: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>New listing</h1>
          <p className="zemba-muted" style={{ marginTop: 0 }}>Our team checks every new listing before it appears in the shop.</p>
          <form onSubmit={handleSubmit}>
            <input className="zemba-input" placeholder="Item title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <textarea className="zemba-input" rows={3} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <input className="zemba-input" type="number" step="0.01" min="0.01" placeholder="Price (ZMW)" value={price} onChange={(e) => setPrice(e.target.value)} required />
            <select className="zemba-input" value={category} onChange={(e) => setCategory(e.target.value)} required><option value="">Select a category</option><option>Fashion</option><option>Electronics</option><option>Food &amp; Drink</option><option>Home</option><option>General</option></select>
            <input className="zemba-input" type="number" min="0" step="1" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)} />
            <div className="zemba-field">Photos ({images.length}/{MAX_PHOTOS}) — the first photo is the main one
              <div className="zemba-photo-grid">
                {images.map((file, index) => (
                  <div key={index} className="zemba-photo"><img src={URL.createObjectURL(file)} alt="" /><button type="button" onClick={() => setImages(images.filter((_, i) => i !== index))} aria-label="Remove photo">×</button></div>
                ))}
              </div>
              {images.length < MAX_PHOTOS && <input className="zemba-input" type="file" accept="image/jpeg,image/png" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />}
            </div>
            {error && <div className="zemba-auth-error">{error}</div>}
            <button className="zemba-btn zemba-btn-primary" style={{ width: '100%' }} disabled={saving}>{saved ? 'Saved ✓' : saving ? 'Publishing…' : 'Publish listing'}</button>
          </form>
        </div>
      </main>
    </div>
  );
}
