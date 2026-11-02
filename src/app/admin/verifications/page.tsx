'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';
import AdminNav from '@/components/AdminNav';

export default function AdminVerifications() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [verified, setVerified] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    fetch('/api/admin/verifications').then((r) => {
      if (r.status === 401 || r.status === 403) { window.location.href = '/admin/login'; return null; }
      return r.json();
    }).then((d) => { if (d) { setCandidates(d.candidates || []); setVerified(d.verified || []); } }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function act(userId: string, action: 'verify' | 'revoke') {
    setMessage('');
    const response = await fetch('/api/admin/verifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, action, reason: notes[userId] || '' }) });
    if (!response.ok) setMessage((await response.json().catch(() => ({}))).error || 'Something went wrong');
    else setMessage(action === 'verify' ? 'Seller verified.' : 'Badge removed.');
    load();
  }

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <AdminNav />
        <main style={{ maxWidth: 900, margin: '1.5rem auto', padding: '0 1.5rem 4rem' }}>
          <h1 style={{ fontSize: '1.7rem', margin: 0 }}>Verify sellers</h1>
          <p className="zemba-muted">Call the seller on WhatsApp video. Check that their face matches the NRC they hold up, that the name matches the account, and that the NRC number matches what they typed. Then write a short note (for example: &quot;ID checked on video call, 12 Nov&quot;) and verify. Do not screenshot, record or save their ID. If you are not sure, do not verify.</p>
          {message && <div className="zemba-legal-note">{message}</div>}
          {loading && <p className="zemba-muted">Loading…</p>}

          <h2 style={{ fontSize: '1.25rem', marginTop: '1.4rem' }}>Not verified yet — {candidates.length}</h2>
          {!loading && candidates.length === 0 && <p className="zemba-muted">Every seller is verified.</p>}
          {candidates.map((c) => (
            <div key={c.user_id} className="zemba-card zemba-flag-card">
              <div><strong>{c.business_name || c.full_name}</strong><br /><span className="zemba-muted">{c.full_name} · {c.phone_number} · {c.email}<br />NRC typed at sign-up: {c.nrc_number || 'none'} · {c.location || '-'}</span></div>
              <div className="zemba-actions">
                <input className="zemba-input" style={{ flex: 1, minWidth: 200, margin: 0 }} placeholder="Note: how you checked them" value={notes[c.user_id] || ''} onChange={(e) => setNotes({ ...notes, [c.user_id]: e.target.value })} />
                <button className="zemba-btn zemba-btn-primary" onClick={() => act(c.user_id, 'verify')}>Mark verified</button>
              </div>
            </div>
          ))}

          <h2 style={{ fontSize: '1.25rem', marginTop: '2rem' }}>Verified sellers — {verified.length}</h2>
          {verified.length === 0 && <p className="zemba-muted">None yet.</p>}
          {verified.map((v) => (
            <div key={v.user_id} className="zemba-card zemba-flag-card">
              <div><strong>{v.business_name || v.full_name}</strong><br /><span className="zemba-muted">{v.email} · verified {v.verified_at ? new Date(v.verified_at).toLocaleDateString() : ''}{v.verification_note ? ` · ${v.verification_note}` : ''}</span></div>
              <div className="zemba-actions">
                <input className="zemba-input" style={{ flex: 1, minWidth: 200, margin: 0 }} placeholder="Reason to remove the badge" value={notes[v.user_id] || ''} onChange={(e) => setNotes({ ...notes, [v.user_id]: e.target.value })} />
                <button className="zemba-btn zemba-btn-secondary zemba-danger" onClick={() => act(v.user_id, 'revoke')}>Remove badge</button>
              </div>
            </div>
          ))}
        </main>
      </div>
    </>
  );
}
