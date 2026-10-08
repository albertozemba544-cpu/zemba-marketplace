'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';

export default function AdminVerifications() {
  const [pending, setPending] = useState<any[]>([]);
  const [verified, setVerified] = useState<any[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch('/api/admin/verifications').then((r) => {
      if (r.status === 401 || r.status === 403) { window.location.href = '/admin/login'; return null; }
      return r.json();
    }).then((d) => { if (d) { setPending(d.pending || []); setVerified(d.verified || []); } }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function decide(userId: string, action: 'approve' | 'reject' | 'revoke') {
    setMessage('');
    const response = await fetch('/api/admin/verifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, action, reason: reasons[userId] || '' }),
    });
    if (!response.ok) setMessage((await response.json().catch(() => ({}))).error || 'Something went wrong');
    else setMessage(action === 'approve' ? 'Seller verified. The photos were deleted.' : action === 'reject' ? 'Rejected. The photos were deleted.' : 'Badge removed.');
    load();
  }

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <nav className="zemba-nav"><a href="/admin/dashboard" className="brand">Zemba Marketplace — Admin</a><div><a href="/admin/dashboard">Overview</a><a href="/admin/users">Users</a><a href="/admin/orders">Stuck orders</a></div></nav>
        <main style={{ maxWidth: 900, margin: '1.5rem auto', padding: '0 1.5rem 4rem' }}>
          <h1 style={{ fontSize: '1.7rem', margin: 0 }}>Seller ID checks</h1>
          <p className="zemba-muted">Verify only when ALL of these are true: the face on the NRC matches the selfie, the name on the NRC matches the account, the NRC number matches what the seller typed, and the photos look real (not a screen, not edited). If you are not sure, reject and ask for new photos. The links below stop working after 5 minutes. Press Refresh for new ones.</p>
          <p><button className="zemba-btn zemba-btn-secondary" onClick={load}>Refresh</button></p>
          {message && <div className="zemba-legal-note">{message}</div>}
          {loading && <p className="zemba-muted">Loading…</p>}
          {!loading && pending.length === 0 && <p className="zemba-muted">No one is waiting for a check.</p>}

          {pending.map((p) => (
            <section key={p.user_id} className="zemba-card" style={{ padding: '1.2rem', marginTop: '1rem' }}>
              <h3 style={{ margin: 0 }}>{p.business_name || p.full_name}</h3>
              <p className="zemba-muted" style={{ margin: '0.3rem 0 0.8rem' }}>
                Name: <strong>{p.full_name}</strong> · NRC number typed: <strong>{p.nrc_number || 'none'}</strong> · Town: {p.location || '-'}<br />
                Phone: {p.phone_number} · Email: {p.email} · Sent: {p.submitted_at ? new Date(p.submitted_at).toLocaleString() : '-'}
              </p>
              <div className="zemba-id-photos">
                <div><strong>NRC</strong>{p.nrc_url ? <a href={p.nrc_url} target="_blank" rel="noopener noreferrer"><img src={p.nrc_url} alt="NRC" /></a> : <p className="zemba-muted">Photo not available</p>}</div>
                <div><strong>Selfie</strong>{p.selfie_url ? <a href={p.selfie_url} target="_blank" rel="noopener noreferrer"><img src={p.selfie_url} alt="Selfie" /></a> : <p className="zemba-muted">Photo not available</p>}</div>
              </div>
              <input className="zemba-input" style={{ marginTop: '0.8rem' }} placeholder="Reason (required only if you reject)" value={reasons[p.user_id] || ''} onChange={(e) => setReasons({ ...reasons, [p.user_id]: e.target.value })} />
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button className="zemba-btn zemba-btn-primary" onClick={() => decide(p.user_id, 'approve')}>Verify this seller</button>
                <button className="zemba-btn zemba-btn-secondary" onClick={() => decide(p.user_id, 'reject')}>Reject</button>
              </div>
            </section>
          ))}

          <h2 style={{ marginTop: '2.2rem', fontSize: '1.3rem' }}>Verified sellers</h2>
          {verified.length === 0 && <p className="zemba-muted">None yet.</p>}
          {verified.map((v) => (
            <div key={v.user_id} className="zemba-card" style={{ padding: '0.9rem 1.1rem', marginTop: '0.6rem', display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}><strong>{v.business_name || v.full_name}</strong><br /><span className="zemba-muted">{v.email} · verified {v.verified_at ? new Date(v.verified_at).toLocaleDateString() : ''}</span></div>
              <input className="zemba-input" style={{ flex: 1, minWidth: 160, margin: 0 }} placeholder="Reason to remove the badge" value={reasons[v.user_id] || ''} onChange={(e) => setReasons({ ...reasons, [v.user_id]: e.target.value })} />
              <button className="zemba-btn zemba-btn-secondary" onClick={() => decide(v.user_id, 'revoke')}>Remove badge</button>
            </div>
          ))}
        </main>
      </div>
    </>
  );
}
