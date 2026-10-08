'use client';

import { useEffect, useState } from 'react';

export default function ResetPassword() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') || '');
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (password !== confirm) { setError('The two passwords do not match'); return; }
    setLoading(true);
    const response = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
    setLoading(false);
    if (response.ok) setDone(true);
    else setError((await response.json().catch(() => ({}))).error || 'Something went wrong. Please try again.');
  }

  return (
    <div className="zemba-auth-wrap">
        <a href="/" className="zemba-auth-home">← Back to home</a>
      <div className="zemba-card zemba-auth-card">
        <h1>Choose a new password</h1>
        {done ? (
          <>
            <p className="sub">Your password has been changed. You can log in now.</p>
            <p><a className="zemba-btn zemba-btn-primary" href="/login" style={{ width: '100%', textAlign: 'center' }}>Log in</a></p>
          </>
        ) : !token ? (
          <>
            <p className="sub">This page needs the link from your email. Please ask for a new reset link.</p>
            <p className="zemba-auth-demo"><a href="/forgot-password">Get a new link</a></p>
          </>
        ) : (
          <>
            <p className="sub">Use at least 8 characters.</p>
            {error && <div className="zemba-auth-error">{error}</div>}
            <form onSubmit={submit}>
              <input className="zemba-input" type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
              <input className="zemba-input" type="password" placeholder="Repeat new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
              <button className="zemba-btn zemba-btn-primary" style={{ width: '100%' }} disabled={loading}>{loading ? 'Saving…' : 'Save new password'}</button>
            </form>
            {error.includes('expired') && <p className="zemba-auth-demo"><a href="/forgot-password">Get a new link</a></p>}
          </>
        )}
      </div>
    </div>
  );
}
