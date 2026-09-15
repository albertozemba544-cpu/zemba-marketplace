'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('zemba_user');
    if (!stored) { window.location.href = '/admin/login'; return; }
    load();
  }, []);

  function load() {
    fetch('/api/admin/disputes').then((r) => r.json()).then((d) => setDisputes(d.disputes));
  }

  async function resolve(dispute_id: string, resolution: 'refund' | 'release') {
    await fetch('/api/admin/disputes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dispute_id, resolution }),
    });
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
            <h3 style={{ color: '#fff', margin: '0 0 0.8rem' }}>Open disputes</h3>
            {disputes.length === 0 && <p style={{ color: 'rgba(255,255,255,0.7)' }}>No disputes right now — seed one manually in the DB to try this flow, or wait for a real one.</p>}
            {disputes.map((d) => (
              <div key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', padding: '0.9rem 0' }}>
                <p style={{ color: '#fff', margin: 0 }}>Order #{d.order_reference} — K{d.amount} — <span style={{ opacity: 0.75 }}>{d.status}</span></p>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem', margin: '0.3rem 0 0.6rem' }}>{d.reason}</p>
                {d.status === 'OPEN' && (
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button className="zemba-btn zemba-btn-secondary" onClick={() => resolve(d.id, 'refund')}>Refund buyer</button>
                    <button className="zemba-btn zemba-btn-primary" onClick={() => resolve(d.id, 'release')}>Release to seller</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
