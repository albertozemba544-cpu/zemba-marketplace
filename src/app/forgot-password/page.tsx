'use client';

import { useState } from 'react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const response = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    setLoading(false);
    if (response.ok) setSent(true);
    else setError((await response.json().catch(() => ({}))).error || 'Something went wrong. Please try again.');
  }

  return (
    <div className="zemba-auth-wrap">
        <a href="/" className="zemba-auth-home">← Back to home</a>
      <div className="zemba-card zemba-auth-card">
        <h1>Forgot your password?</h1>
        {sent ? (
          <>
            <p className="sub">If there is an account for <strong>{email}</strong>, we have sent a link to choose a new password. It can take a minute - check your spam folder too.</p>
            <p className="zemba-auth-demo"><a href="/login">Back to log in</a></p>
          </>
        ) : (
          <>
            <p className="sub">Enter the email you registered with and we will send you a reset link.</p>
            {error && <div className="zemba-auth-error">{error}</div>}
            <form onSubmit={submit}>
              <input className="zemba-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <button className="zemba-btn zemba-btn-primary" style={{ width: '100%' }} disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
            </form>
            <p className="zemba-auth-demo"><a href="/login">Back to log in</a></p>
          </>
        )}
      </div>
    </div>
  );
}
