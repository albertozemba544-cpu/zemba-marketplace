'use client';

import { useState } from 'react';
import SkyBackground from '@/components/SkyBackground';

export default function CustomerLogin() {
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
      body: JSON.stringify({ email, password, role: 'customer' }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('zemba_user', JSON.stringify(data));
      window.location.href = '/browse';
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
          <h1>Welcome back</h1>
          <p className="sub">Log in to browse and track your orders.</p>
          {error && <div className="zemba-auth-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <input className="zemba-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="zemba-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="zemba-btn zemba-btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>
          <p className="zemba-auth-demo"><a href="/register">Create a buyer account</a></p>
          <p className="zemba-auth-demo">Demo: customer@zemba.demo / demo1234</p>
          <p className="zemba-auth-demo">
            Selling instead? <a href="/seller/login" style={{ textDecoration: 'underline' }}>Seller login</a>
          </p>
        </div>
      </div>
    </>
  );
}
