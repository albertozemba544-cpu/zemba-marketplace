'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';
import { shrinkImage } from '@/lib/imageResize';

export default function SellerVerify() {
  const [info, setInfo] = useState<{ status: string; reason: string | null } | null>(null);
  const [nrc, setNrc] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function load() {
    fetch('/api/seller/verification').then((r) => {
      if (r.status === 401 || r.status === 403) { window.location.href = '/seller/login'; return null; }
      return r.json();
    }).then((d) => { if (d) setInfo(d); });
  }
  useEffect(load, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!nrc || !selfie) { setError('Please add both photos.'); return; }
    setBusy(true);
    try {
      const form = new FormData();
      form.set('nrc_photo', await shrinkImage(nrc, 1600, 0.85));
      form.set('selfie', await shrinkImage(selfie, 1200, 0.85));
      const response = await fetch('/api/seller/verification', { method: 'POST', body: form });
      if (response.ok) { setNrc(null); setSelfie(null); load(); }
      else setError((await response.json().catch(() => ({}))).error || 'Could not send your photos');
    } catch {
      setError('Could not send your photos. Please try again.');
    }
    setBusy(false);
  }

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <nav className="zemba-nav"><a href="/seller/dashboard" className="brand">Zemba Marketplace — Seller</a><div><a href="/seller/dashboard">Dashboard</a></div></nav>
        <main style={{ maxWidth: 640, margin: '1.5rem auto', padding: '0 1.5rem 4rem' }}>
          <h1 style={{ fontSize: '1.7rem', margin: 0 }}>Get the Verified seller badge</h1>
          <p className="zemba-muted">Buyers trust sellers whose identity has been checked, and verified shops are easier to sell for. It takes two photos.</p>

          {!info && <p className="zemba-muted">Loading…</p>}

          {info?.status === 'VERIFIED' && <div className="zemba-card" style={{ padding: '1.4rem' }}><span className="zemba-verified" style={{ marginLeft: 0 }}>✓ Verified seller</span><p>Your ID has been checked. The badge shows on your listings and your shop page.</p></div>}

          {info?.status === 'SUBMITTED' && <div className="zemba-card" style={{ padding: '1.4rem' }}><strong>Your photos are being checked</strong><p>We usually check them within 1 to 2 working days and will email you the result.</p></div>}

          {(info?.status === 'NONE' || info?.status === 'REJECTED') && (
            <form className="zemba-card" style={{ padding: '1.4rem' }} onSubmit={submit}>
              {info.status === 'REJECTED' && info.reason && <div className="zemba-form-error">Last time: {info.reason}</div>}
              <label className="zemba-field">1. A clear photo of the front of your NRC
                <input className="zemba-input" type="file" accept="image/jpeg,image/png" onChange={(e) => setNrc(e.target.files?.[0] || null)} required />
              </label>
              <label className="zemba-field">2. A selfie of your face, holding the same NRC next to it
                <input className="zemba-input" type="file" accept="image/jpeg,image/png" onChange={(e) => setSelfie(e.target.files?.[0] || null)} required />
              </label>
              <ul className="zemba-muted" style={{ paddingLeft: '1.2rem', lineHeight: 1.6 }}>
                <li>All four corners of the NRC must show, and the words and number must be easy to read.</li>
                <li>The name and NRC number must match the ones you gave when you registered.</li>
                <li>Good light, no filters, no sunglasses or hats.</li>
              </ul>
              <p className="zemba-muted" style={{ fontSize: '0.85rem' }}>Only authorised Zemba staff can see these photos. We delete them as soon as we have decided, and we keep only the result. See our <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</p>
              {error && <div className="zemba-form-error">{error}</div>}
              <button className="zemba-btn zemba-btn-primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Sending…' : 'Send for checking'}</button>
            </form>
          )}
        </main>
      </div>
    </>
  );
}
