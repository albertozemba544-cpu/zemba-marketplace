'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';
import AdminNav from '@/components/AdminNav';

export default function AdminFlags() {
  const [data, setData] = useState<any>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  function load() {
    fetch('/api/admin/flags').then((r) => {
      if (r.status === 401 || r.status === 403) { window.location.href = '/admin/login'; return null; }
      return r.json();
    }).then((d) => { if (d) setData(d); });
  }
  useEffect(load, []);

  async function act(action: string, target_id: string) {
    setMessage('');
    const response = await fetch('/api/admin/flags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, target_id, reason: reasons[target_id] || '' }) });
    if (!response.ok) setMessage((await response.json().catch(() => ({}))).error || 'Something went wrong');
    else setMessage('Done.');
    load();
  }

  const input = (id: string, placeholder: string) => (
    <input className="zemba-input" style={{ flex: 1, minWidth: 180, margin: 0 }} placeholder={placeholder} value={reasons[id] || ''} onChange={(e) => setReasons({ ...reasons, [id]: e.target.value })} />
  );

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <AdminNav />
        <main style={{ maxWidth: 960, margin: '1.5rem auto', padding: '0 1.5rem 4rem' }}>
          <h1 style={{ fontSize: '1.7rem', margin: 0 }}>Flags &amp; reports</h1>
          <p className="zemba-muted">Listings and sellers go live on their own. Only things that look wrong show up here: listings that tripped the automatic checks, and anything people reported. Three different reports hide a listing automatically until you decide. Whenever you suspend, ban or remove something, the person is emailed your reason.</p>
          {message && <div className="zemba-legal-note">{message}</div>}
          {!data && <p className="zemba-muted">Loading…</p>}

          {data && (
            <>
              <h2 style={{ fontSize: '1.25rem', marginTop: '1.6rem' }}>Flagged listings (hidden) — {data.flaggedProducts.length}</h2>
              {data.flaggedProducts.length === 0 && <p className="zemba-muted">Nothing to check.</p>}
              {data.flaggedProducts.map((p: any) => (
                <div key={p.id} className="zemba-card zemba-flag-card">
                  <div className="zemba-flag-main">
                    {p.image_url && <img src={p.image_url} alt="" className="zemba-flag-thumb" />}
                    <div>
                      <strong>{p.title}</strong> — K{Number(p.price).toFixed(2)}<br />
                      <span className="zemba-muted">Seller: {p.seller_name}</span><br />
                      <span className="zemba-pill bad">{p.flag_reason}</span>
                      <br /><a href={`/product/${p.id}`} target="_blank" rel="noopener noreferrer">Open the listing</a>
                    </div>
                  </div>
                  <div className="zemba-actions">
                    {input(p.id, 'Reason (needed to remove it; the seller is emailed)')}
                    <button className="zemba-btn zemba-btn-primary" onClick={() => act('restore_product', p.id)}>It is fine — publish it</button>
                    <button className="zemba-btn zemba-btn-secondary zemba-danger" onClick={() => act('remove_product', p.id)}>Remove it</button>
                  </div>
                </div>
              ))}

              <h2 style={{ fontSize: '1.25rem', marginTop: '2rem' }}>Reported — {data.reports.length}</h2>
              {data.reports.length === 0 && <p className="zemba-muted">No open reports.</p>}
              {data.reports.map((r: any) => (
                <div key={`${r.target_type}-${r.target_id}`} className="zemba-card zemba-flag-card">
                  <div>
                    <span className="zemba-pill info">{r.target_type === 'PRODUCT' ? 'Listing' : 'Person'}</span> <strong>{r.name}</strong> — reported {r.count} time{r.count === 1 ? '' : 's'}<br />
                    <span className="zemba-muted">{r.extra}</span><br />
                    <span className="zemba-muted">Reasons: {(r.reasons || []).join(', ')}</span>
                    {r.details.map((d: string, i: number) => <p key={i} className="zemba-muted" style={{ margin: '0.3rem 0' }}>“{d}”</p>)}
                    {r.target_type === 'PRODUCT' && <a href={`/product/${r.target_id}`} target="_blank" rel="noopener noreferrer">Open the listing</a>}
                  </div>
                  <div className="zemba-actions">
                    {input(r.target_id, 'Reason (sent to the person if you act)')}
                    {r.target_type === 'PRODUCT' ? (
                      <>
                        <button className="zemba-btn zemba-btn-primary" onClick={() => act('dismiss_product', r.target_id)}>Dismiss</button>
                        <button className="zemba-btn zemba-btn-secondary zemba-danger" onClick={() => act('remove_product', r.target_id)}>Remove listing</button>
                      </>
                    ) : (
                      <>
                        <button className="zemba-btn zemba-btn-primary" onClick={() => act('dismiss_user', r.target_id)}>Dismiss</button>
                        <button className="zemba-btn zemba-btn-secondary" onClick={() => act('suspend_user', r.target_id)}>Suspend</button>
                        <button className="zemba-btn zemba-btn-secondary zemba-danger" onClick={() => act('ban_user', r.target_id)}>Ban</button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              <h2 style={{ fontSize: '1.25rem', marginTop: '2rem' }}>Flagged people — {data.flaggedUsers.length}</h2>
              {data.flaggedUsers.length === 0 && <p className="zemba-muted">Nobody is flagged.</p>}
              {data.flaggedUsers.map((u: any) => (
                <div key={u.id} className="zemba-card zemba-flag-card">
                  <div><strong>{u.business_name || u.full_name}</strong> <span className="zemba-muted">({u.role} · {u.email} · {u.account_status})</span><br /><span className="zemba-pill bad">{u.flag_reason}</span></div>
                  <div className="zemba-actions">
                    {input(u.id, 'Reason (sent to the person if you act)')}
                    <button className="zemba-btn zemba-btn-primary" onClick={() => act('dismiss_user', u.id)}>Clear the flag</button>
                    <button className="zemba-btn zemba-btn-secondary" onClick={() => act('suspend_user', u.id)}>Suspend</button>
                    <button className="zemba-btn zemba-btn-secondary zemba-danger" onClick={() => act('ban_user', u.id)}>Ban</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </main>
      </div>
    </>
  );
}
