'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('zemba_user');
    if (!stored) { window.location.href = '/admin/login'; return; }
    load();
  }, []);

  function load() {
    fetch('/api/admin/disputes').then((r) => {
      if (r.status === 401 || r.status === 403) { window.location.href = '/admin/login'; return null; }
      return r.json();
    }).then((d) => { if (d) setDisputes(d.disputes || []); });
  }

  async function resolve(dispute_id: string, resolution: 'refund' | 'release') {
    setError('');
    const response = await fetch('/api/admin/disputes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dispute_id, resolution, admin_notes: notes[dispute_id] || '' }),
    });
    if (!response.ok) setError((await response.json().catch(() => ({}))).error || 'Could not resolve the dispute');
    load();
  }

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <nav className="zemba-nav">
          <a href="/admin/dashboard" className="brand">Zemba Marketplace — Admin</a>
          <div><a href="/admin/dashboard">Overview</a><a href="/admin/users">Users</a></div>
        </nav>
        <main style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '1.5rem auto', padding: '0 1.5rem 4rem' }}>
          <div className="zemba-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ color: '#fff', margin: '0 0 0.8rem' }}>Disputes</h3>
            {error && <p style={{ color: '#FFD9D9' }}>⚠ {error}</p>}
            {disputes.length === 0 && <p style={{ color: 'rgba(255,255,255,0.7)' }}>No disputes right now.</p>}
            {disputes.map((d) => (
              <div key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', padding: '0.9rem 0' }}>
                <p style={{ color: '#fff', margin: 0 }}>Order #{d.order_reference} — K{Number(d.amount).toFixed(2)} — <span style={{ opacity: 0.75 }}>{d.status}</span></p>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem', margin: '0.3rem 0 0.6rem' }}>{d.reason}</p>
                {(d.messages || []).length > 0 && (
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.6rem', borderRadius: 4, marginBottom: '0.6rem', maxHeight: 160, overflowY: 'auto' }}>
                    {d.messages.map((m: any) => (
                      <div key={m.id} style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.3rem' }}>
                        <strong style={{ color: '#FFD37A' }}>{m.full_name} ({m.sender_role})</strong>: {m.message}
                      </div>
                    ))}
                  </div>
                )}
                {d.admin_notes && <p style={{ color: '#FFD37A', fontSize: '0.85rem' }}>Decision notes: {d.admin_notes}</p>}
                {d.status === 'OPEN' && (
                  <>
                    <textarea className="zemba-input" rows={2} placeholder="Notes for the buyer and seller (optional)" value={notes[d.id] || ''} onChange={(e) => setNotes({ ...notes, [d.id]: e.target.value })} />
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <button className="zemba-btn zemba-btn-secondary" onClick={() => resolve(d.id, 'refund')}>Refund buyer</button>
                      <button className="zemba-btn zemba-btn-primary" onClick={() => resolve(d.id, 'release')}>Release to seller</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
