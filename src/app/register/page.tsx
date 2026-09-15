'use client';

import { useState } from 'react';
import SkyBackground from '@/components/SkyBackground';

export default function RegisterPage() {
  const [role, setRole] = useState<'customer' | 'seller'>('customer');
  const [form, setForm] = useState({ full_name: '', business_name: '', phone_number: '', email: '', password: '', momo_provider: 'MTN', momo_number: '', nrc_number: '', location: '' });
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage('Creating account...');
    const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, role }) });
    const data = await response.json();
    setMessage(response.ok ? 'Account created. An admin must approve it before you can log in.' : data.error || 'Could not create account.');
    if (response.ok) setForm({ full_name: '', business_name: '', phone_number: '', email: '', password: '', momo_provider: 'MTN', momo_number: '', nrc_number: '', location: '' });
  }

  return (
    <><SkyBackground mode="ambient" /><div className="zemba-auth-wrap"><div className="zemba-card zemba-auth-card">
      <h1>Create your Zemba account</h1><p className="sub">Join as a buyer or apply to sell on the marketplace.</p>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button type="button" className="zemba-btn zemba-btn-secondary" onClick={() => setRole('customer')} style={{ opacity: role === 'customer' ? 1 : 0.6 }}>Buyer</button>
        <button type="button" className="zemba-btn zemba-btn-secondary" onClick={() => setRole('seller')} style={{ opacity: role === 'seller' ? 1 : 0.6 }}>Seller</button>
      </div>
      <form onSubmit={submit}>
        <input className="zemba-input" placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        {role === 'seller' && <input className="zemba-input" placeholder="Business name" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} required />}
        <input className="zemba-input" placeholder="Phone number" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} required />
        <input className="zemba-input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        {role === 'seller' && (
          <>
            <input className="zemba-input" placeholder="NRC Number (e.g., 123456/89/1)" value={form.nrc_number} onChange={(e) => setForm({ ...form, nrc_number: e.target.value })} required />
            <select className="zemba-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required>
              <option value="">Select your location</option>
              <option value="Lusaka">Lusaka</option>
              <option value="Kitwe">Kitwe</option>
              <option value="Ndola">Ndola</option>
              <option value="Livingstone">Livingstone</option>
              <option value="Kabwe">Kabwe</option>
              <option value="Kasama">Kasama</option>
              <option value="Other">Other</option>
            </select>
          </>
        )}
        {role === 'seller' && <><input className="zemba-input" placeholder="Mobile money number" value={form.momo_number} onChange={(e) => setForm({ ...form, momo_number: e.target.value })} required /><select className="zemba-input" value={form.momo_provider} onChange={(e) => setForm({ ...form, momo_provider: e.target.value })}><option value="MTN">MTN</option><option value="AIRTEL">Airtel</option></select></>}
        <input className="zemba-input" type="password" placeholder="Password (8+ characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required />
        <button className="zemba-btn zemba-btn-primary" style={{ width: '100%' }}>Create account</button>
      </form>
      {message && <p className="zemba-auth-demo">{message}</p>}
      <p className="zemba-auth-demo"><a href={role === 'seller' ? '/seller/login' : '/login'}>Already have an account? Log in</a></p>
    </div></div></>
  );
}