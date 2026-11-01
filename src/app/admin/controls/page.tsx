'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';
import AdminNav from '@/components/AdminNav';

export default function AdminControls() {
  const [state, setState] = useState<any>(null);
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  function load() {
    fetch('/api/admin/controls').then((r) => {
      if (r.status === 401 || r.status === 403) { window.location.href = '/admin/login'; return null; }
      return r.json();
    }).then((d) => { if (d) setState(d); });
  }
  useEffect(load, []);

  async function post(body: any) {
    setMessage('');
    const response = await fetch('/api/admin/controls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) setMessage((await response.json().catch(() => ({}))).error || 'Something went wrong');
    else { setMessage('Done.'); setReference(''); setReason(''); }
    load();
  }

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <AdminNav />
        <main style={{ maxWidth: 760, margin: '1.5rem auto', padding: '0 1.5rem 4rem' }}>
          <h1 style={{ fontSize: '1.7rem', margin: 0 }}>Controls</h1>
          <p className="zemba-muted">Everything runs by itself. These are your emergency brakes, for a serious situation only.</p>
          {message && <div className="zemba-legal-note">{message}</div>}
          {!state && <p className="zemba-muted">Loading…</p>}
          {state && (
            <>
              <section className="zemba-card" style={{ padding: '1.3rem', marginTop: '1rem' }}>
                <h3 style={{ marginTop: 0 }}>Pause all payments</h3>
                <p>While paused, nobody can start a payment and no money can be released to a seller. Orders, messages and browsing keep working. Use it if you suspect fraud or a payment problem.</p>
                <p><span className={`zemba-pill ${state.payments_paused ? 'bad' : 'ok'}`}>{state.payments_paused ? 'Payments are PAUSED' : 'Payments are running'}</span></p>
                {state.payments_paused
                  ? <button className="zemba-btn zemba-btn-primary" onClick={() => post({ action: 'resume' })}>Resume payments</button>
                  : <button className="zemba-btn zemba-btn-secondary zemba-danger" onClick={() => { if (confirm('Pause all payments now?')) post({ action: 'pause' }); }}>Pause all payments</button>}
              </section>

              <section className="zemba-card" style={{ padding: '1.3rem', marginTop: '1rem' }}>
                <h3 style={{ marginTop: 0 }}>Put one order on hold</h3>
                <p>A held order cannot be released, refunded by agreement, or timed out until you remove the hold. The buyer and seller are told.</p>
                <input className="zemba-input" placeholder="Order number, for example 3F9A12BC77" value={reference} onChange={(e) => setReference(e.target.value)} />
                <input className="zemba-input" placeholder="Reason (they are told)" value={reason} onChange={(e) => setReason(e.target.value)} />
                <button className="zemba-btn zemba-btn-secondary zemba-danger" onClick={() => post({ action: 'hold', reference, reason })}>Hold this order</button>
              </section>

              <h3 style={{ marginTop: '1.6rem' }}>Orders on hold — {state.held.length}</h3>
              {state.held.length === 0 && <p className="zemba-muted">None.</p>}
              {state.held.map((o: any) => (
                <div key={o.order_reference} className="zemba-card zemba-flag-card">
                  <div><strong>#{o.order_reference}</strong> {o.title && `— ${o.title}`} — K{Number(o.amount).toFixed(2)} <span className="zemba-pill wait">{o.status}</span><br /><span className="zemba-muted">Reason: {o.hold_reason}</span></div>
                  <div className="zemba-actions"><button className="zemba-btn zemba-btn-primary" onClick={() => post({ action: 'unhold', reference: o.order_reference })}>Remove the hold</button></div>
                </div>
              ))}
            </>
          )}
        </main>
      </div>
    </>
  );
}
