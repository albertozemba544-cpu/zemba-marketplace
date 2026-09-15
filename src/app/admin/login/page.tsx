'use client';

import { useState } from 'react';
import SkyBackground from '@/components/SkyBackground';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: 'admin' }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('zemba_user', JSON.stringify(data));
      window.location.href = '/admin/dashboard';
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Login failed');
    }
  }

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-auth-wrap">
        <div className="zemba-card zemba-auth-card">
          <h1>Admin console</h1>
          <p className="sub">Platform oversight — users, disputes, activity.</p>
          {error && <div className="zemba-auth-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <input className="zemba-input" type="email" placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="zemba-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="zemba-btn zemba-btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>
          <p className="zemba-auth-demo">Demo: admin@zemba.demo / demo1234</p>
        </div>
      </div>
    </>
  );
}
