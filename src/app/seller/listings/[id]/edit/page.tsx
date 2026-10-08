'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { shrinkImage } from '@/lib/imageResize';

interface Photo { id: string; url: string; }
const MAX_PHOTOS = 5;

export default function EditListing() {
  const params = useParams<{ id: string }>();
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', price: '', category: 'General', stock: '1', status: 'ACTIVE' });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [approval, setApproval] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('zemba_user');
    if (!stored || JSON.parse(stored).role !== 'seller') { window.location.href = '/seller/login'; return; }
    fetch(`/api/products/${params.id}`).then(async (response) => {
      if (response.status === 401 || response.status === 403) { window.location.href = '/seller/login'; return; }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error || 'Listing not found'); setLoaded(true); return; }
      const p = data.product;
      setForm({ title: p.title, description: p.description || '', price: String(p.price), category: p.category || 'General', stock: String(p.stock), status: p.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE' });
      setPhotos(data.images || []);
      setApproval(p.approval_status);
      setLoaded(true);
    });
  }, [params.id]);

  const keptPhotos = photos.filter((p) => !removed.includes(p.id));
  const room = MAX_PHOTOS - keptPhotos.length - newFiles.length;

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const chosen = Array.from(list).slice(0, Math.max(room, 0));
    const shrunk = await Promise.all(chosen.map((file) => shrinkImage(file)));
    setNewFiles((current) => [...current, ...shrunk]);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(''); setNotice(''); setSaving(true);
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.set(key, String(value)));
    body.set('remove_image_ids', removed.join(','));
    newFiles.forEach((file) => body.append('images', file));
    const response = await fetch(`/api/products/${params.id}`, { method: 'PATCH', body });
    setSaving(false);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setError(data.error || 'Could not save your changes'); return; }
    setNotice(data.needs_review ? 'Saved. Because you changed the title, description or photos, the listing will be re-checked by our team before it shows in the shop again.' : 'Saved.');
    setTimeout(() => { window.location.href = '/seller/dashboard'; }, 1600);
  }

  async function removeListing() {
    if (!window.confirm('Remove this listing? Buyers will no longer see it. Past orders are not affected.')) return;
    const response = await fetch(`/api/products/${params.id}`, { method: 'DELETE' });
    if (response.ok) window.location.href = '/seller/dashboard';
    else setError((await response.json().catch(() => ({}))).error || 'Could not remove the listing');
  }

  return (
    <div className="zemba-page">
      <nav className="zemba-nav"><a href="/seller/dashboard" className="brand">Zemba Marketplace — Seller</a><div><a href="/seller/dashboard">Back to dashboard</a></div></nav>
      <main style={{ maxWidth: 560, margin: '2rem auto', padding: '0 1.5rem 4rem' }}>
        <div className="zemba-card" style={{ padding: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>Edit listing</h1>
          {approval === 'PENDING' && <p className="zemba-muted">This listing is waiting for approval from our team.</p>}
          {!loaded && <p className="zemba-muted">Loading…</p>}
          {loaded && (
            <form onSubmit={save}>
              <label className="zemba-field">Title<input className="zemba-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={255} /></label>
              <label className="zemba-field">Description<textarea className="zemba-input" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              <div className="zemba-two-col">
                <label className="zemba-field">Price (ZMW)<input className="zemba-input" type="number" step="0.01" min="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></label>
                <label className="zemba-field">Stock<input className="zemba-input" type="number" min="0" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required /></label>
              </div>
              <div className="zemba-two-col">
                <label className="zemba-field">Category
                  <select className="zemba-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {['Fashion', 'Electronics', 'Food & Drink', 'Home', 'General'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label className="zemba-field">Visibility
                  <select className="zemba-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="ACTIVE">Active (visible in the shop)</option>
                    <option value="PAUSED">Paused (hidden)</option>
                  </select>
                </label>
              </div>

              <div className="zemba-field">Photos ({keptPhotos.length + newFiles.length}/{MAX_PHOTOS})
                <div className="zemba-photo-grid">
                  {keptPhotos.map((photo) => (
                    <div key={photo.id} className="zemba-photo"><img src={photo.url} alt="" /><button type="button" onClick={() => setRemoved([...removed, photo.id])} aria-label="Remove photo">×</button></div>
                  ))}
                  {newFiles.map((file, index) => (
                    <div key={index} className="zemba-photo"><img src={URL.createObjectURL(file)} alt="" /><button type="button" onClick={() => setNewFiles(newFiles.filter((_, i) => i !== index))} aria-label="Remove photo">×</button></div>
                  ))}
                </div>
                {room > 0 && <input className="zemba-input" type="file" accept="image/jpeg,image/png" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />}
              </div>

              {error && <div className="zemba-auth-error">{error}</div>}
              {notice && <div className="zemba-form-notice">{notice}</div>}
              <button className="zemba-btn zemba-btn-primary" style={{ width: '100%' }} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
              <button type="button" className="zemba-btn zemba-btn-secondary zemba-danger" style={{ width: '100%', marginTop: '0.7rem' }} onClick={removeListing}>Remove this listing</button>
            </form>
          )}
          {loaded && !form.title && error && <p><a href="/seller/dashboard">Back to dashboard</a></p>}
        </div>
      </main>
    </div>
  );
}
