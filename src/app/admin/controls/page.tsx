'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';
import AdminNav from '@/components/AdminNav';

export default function AdminControls() {
  const [state, setState] = useState<any>(null);
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  function load() {
    fetch('/api/admin/controls').then((r) => {
      if (r.status === 401 || r.status === 403) { window.location.href = '/admin/login'; return null; }
      return r.json();
    }).then((d) => { if (d) setState(d); });
  }
  useEffect(() => {
    load();
    fetch('/api/admin/email-test').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setEmail(d); });
  }, []);

  async function sendTest() {
    setTesting(true);
    setTestResult(null);
    const response = await fetch('/api/admin/email-test', { method: 'POST' });
    setTestResult(await response.json().catch(() => ({ ok: false, error: 'Something went wrong. Try again.' })));
    setTesting(false);
  }

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
                <h3 style={{ marginTop: 0 }}>Email check</h3>
                <p>Password resets, order alerts and sold-out notices all go by email. Check that it is set up, then send yourself a test.</p>
                {email && (
                  <ul className="zemba-check-list">
                    <li>{email.has_key ? '✅' : '❌'} Email key in Vercel {email.provider ? `(${email.provider})` : '(BREVO_API_KEY)'}</li>
                    <li>{email.has_from ? '✅' : '❌'} Sender address in Vercel {email.from_address ? `(${email.from_address})` : '(EMAIL_FROM_ADDRESS)'}</li>
                    <li>{email.has_admin_alert ? '✅' : '⚠️'} Your alert address (ADMIN_ALERT_EMAIL){email.has_admin_alert ? '' : ' — optional, for site error alerts'}</li>
                  </ul>
                )}
                <button className="zemba-btn zemba-btn-primary" onClick={sendTest} disabled={testing}>{testing ? 'Sending…' : 'Send a test email to me'}</button>
                {testResult && (testResult.ok
                  ? <div className="zemba-legal-note">Sent to {testResult.sent_to}. Check your inbox, and your Spam or Junk folder too. If it arrives, emails work.</div>
                  : <div className="zemba-form-error">The test failed. {testResult.error}</div>)}
              </section>

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
