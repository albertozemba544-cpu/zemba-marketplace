'use client';

import { useEffect, useState } from 'react';

export default function VerifyEmail() {
  const [state, setState] = useState<'checking' | 'ok' | 'failed' | 'none'>('checking');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resent, setResent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { setState('none'); return; }
    fetch('/api/auth/verify-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      .then(async (response) => {
        if (response.ok) setState('ok');
        else { setState('failed'); setMessage((await response.json().catch(() => ({}))).error || 'This link is invalid or has expired.'); }
      })
      .catch(() => { setState('failed'); setMessage('Could not reach the server. Please try again.'); });
  }, []);

  async function resend(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setMessage('');
    const response = await fetch('/api/auth/resend-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    setSending(false);
    if (response.ok) setResent(true);
    else setMessage((await response.json().catch(() => ({}))).error || 'Something went wrong. Please try again.');
  }

  return (
    <div className="zemba-auth-wrap">
        <a href="/" className="zemba-auth-home">← Back to home</a>
      <div className="zemba-card zemba-auth-card">
        {state === 'checking' && <><h1>Confirming…</h1><p className="sub">One moment please.</p></>}
        {state === 'ok' && (
          <>
            <h1>Email confirmed ✓</h1>
            <p className="sub">Thank you! Your email address is confirmed. Sellers may still need to wait for approval from our team.</p>
            <p><a className="zemba-btn zemba-btn-primary" href="/login" style={{ width: '100%', textAlign: 'center' }}>Log in</a></p>
          </>
        )}
        {(state === 'failed' || state === 'none') && (
          <>
            <h1>{state === 'failed' ? 'Link problem' : 'Confirm your email'}</h1>
            <p className="sub">{state === 'failed' ? message : 'Enter your email and we will send you a new confirmation link.'}</p>
            {resent ? (
              <p className="sub">If that email needs confirming, we have sent a new link. Check your inbox and spam folder.</p>
            ) : (
              <form onSubmit={resend}>
                {state === 'none' && message && <div className="zemba-auth-error">{message}</div>}
                <input className="zemba-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <button className="zemba-btn zemba-btn-primary" style={{ width: '100%' }} disabled={sending}>{sending ? 'Sending…' : 'Send a new link'}</button>
              </form>
            )}
            <p className="zemba-auth-demo"><a href="/login">Back to log in</a></p>
          </>
        )}
      </div>
    </div>
  );
}
