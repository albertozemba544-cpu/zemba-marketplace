'use client';

import { useEffect, useState } from 'react';

export default function Unsubscribe() {
  const [token, setToken] = useState('');
  const [state, setState] = useState<'ask' | 'done' | 'bad'>('ask');

  useEffect(() => { setToken(new URLSearchParams(window.location.search).get('token') || ''); }, []);

  async function confirmIt() {
    const response = await fetch('/api/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    setState(response.ok ? 'done' : 'bad');
  }

  return (
    <div className="zemba-auth-wrap">
      <a href="/" className="zemba-auth-home">← Back to home</a>
      <div className="zemba-card zemba-auth-card">
        <h1>Unsubscribe</h1>
        {state === 'ask' && (
          <>
            <p className="sub">Stop getting news and offers from Zemba by email? You will still get important messages about your orders and account.</p>
            <button className="zemba-btn zemba-btn-primary" style={{ width: '100%' }} onClick={confirmIt} disabled={!token}>Yes, unsubscribe me</button>
          </>
        )}
        {state === 'done' && <p className="sub">Done. You will not get news and offers from us any more. You can switch them back on in My account.</p>}
        {state === 'bad' && <p className="sub">This link is not valid or has expired. You can change your choice in My account after logging in.</p>}
      </div>
    </div>
  );
}
