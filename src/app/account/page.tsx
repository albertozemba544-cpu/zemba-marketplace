'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';

export default function Account() {
  const [me, setMe] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [news, setNews] = useState(false);
  const [wa, setWa] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [passMsg, setPassMsg] = useState('');

  useEffect(() => {
    fetch('/api/account').then((r) => {
      if (r.status === 401) { window.location.href = '/login'; return null; }
      return r.json();
    }).then((d) => {
      if (!d) return;
      setMe(d); setName(d.full_name || ''); setPhone(d.phone_number || ''); setNews(Boolean(d.newsletter_opt_in)); setWa(Boolean(d.whatsapp_opt_in));
    });
  }, []);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setProfileMsg('Saving…');
    const response = await fetch('/api/account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name: name, phone_number: phone, newsletter_opt_in: news, whatsapp_opt_in: wa }) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setProfileMsg('Saved.');
      try {
        const stored = JSON.parse(localStorage.getItem('zemba_user') || '{}');
        localStorage.setItem('zemba_user', JSON.stringify({ ...stored, full_name: data.full_name }));
      } catch { /* ignore */ }
    } else setProfileMsg(data.error || 'Could not save your changes.');
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setPassMsg('Saving…');
    const response = await fetch('/api/account/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current_password: current, new_password: next }) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) { setPassMsg('Password changed.'); setCurrent(''); setNext(''); }
    else setPassMsg(data.error || 'Could not change your password.');
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('zemba_user');
    window.location.href = '/';
  }

  const home = me?.role === 'seller' ? '/seller/dashboard' : me?.role === 'admin' ? '/admin/dashboard' : '/orders';
  const homeLabel = me?.role === 'seller' ? 'Dashboard' : me?.role === 'admin' ? 'Admin' : 'My orders';

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <nav className="zemba-nav"><a href="/" className="brand">Zemba Marketplace</a><div><a href="/browse">Shop</a><a href={home}>{homeLabel}</a><a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>Log out</a></div></nav>
        <main style={{ maxWidth: 620, margin: '1.5rem auto', padding: '0 1.5rem 4rem' }}>
          <h1 style={{ fontSize: '1.7rem', margin: 0 }}>My account</h1>
          {!me && <p className="zemba-muted">Loading…</p>}
          {me && (
            <>
              <form className="zemba-card" style={{ padding: '1.4rem', marginTop: '1rem' }} onSubmit={saveProfile}>
                <h3 style={{ marginTop: 0 }}>Your details</h3>
                <label className="zemba-field">Full name<input className="zemba-input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} /></label>
                <label className="zemba-field">Phone number<input className="zemba-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required maxLength={20} /></label>
                <label className="zemba-field">Email<input className="zemba-input" value={me.email} disabled /></label>
                <p className="zemba-muted" style={{ marginTop: '-0.4rem' }}>{me.email_verified ? 'Your email is confirmed.' : 'Your email is not confirmed yet.'} To change your email address, <a href="/contact">contact us</a>.</p>
                <label className="zemba-check"><input type="checkbox" checked={news} onChange={(e) => setNews(e.target.checked)} /><span>Send me news and offers from Zemba.</span></label>
                <label className="zemba-check"><input type="checkbox" checked={wa} onChange={(e) => setWa(e.target.checked)} /><span>Send my order updates to my phone on WhatsApp.</span></label>
                {profileMsg && <p className="zemba-muted">{profileMsg}</p>}
                <button className="zemba-btn zemba-btn-primary">Save changes</button>
              </form>

              <form className="zemba-card" style={{ padding: '1.4rem', marginTop: '1rem' }} onSubmit={changePassword}>
                <h3 style={{ marginTop: 0 }}>Change your password</h3>
                <label className="zemba-field">Current password<input className="zemba-input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" /></label>
                <label className="zemba-field">New password (at least 8 characters)<input className="zemba-input" type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} autoComplete="new-password" /></label>
                {passMsg && <p className="zemba-muted">{passMsg}</p>}
                <button className="zemba-btn zemba-btn-primary">Change password</button>
              </form>

              <p className="zemba-muted" style={{ marginTop: '1.4rem' }}>Want your account or data deleted? <a href="/contact">Contact us</a> and we will help. Read how we use your information in our <a href="/privacy">Privacy Policy</a>.</p>
            </>
          )}
        </main>
      </div>
    </>
  );
}
