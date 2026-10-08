'use client';

import { useEffect, useState } from 'react';

export default function AdminMessages() {
  const [messages, setMessages] = useState<any[] | null>(null);

  function load() {
    fetch('/api/admin/messages').then((response) => {
      if (response.status === 401 || response.status === 403) { window.location.href = '/admin/login'; return null; }
      return response.json();
    }).then((d) => d && setMessages(d.messages || []));
  }
  useEffect(() => {
    if (!localStorage.getItem('zemba_user')) { window.location.href = '/admin/login'; return; }
    load();
  }, []);

  async function setStatus(id: string, status: 'NEW' | 'DONE') {
    await fetch('/api/admin/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    load();
  }

  return (
    <div className="zemba-page">
      <nav className="zemba-nav">
        <a href="/admin/dashboard" className="brand">Zemba Marketplace — Admin</a>
        <div><a href="/admin/dashboard">Overview</a><a href="/admin/orders">Stuck orders</a><a href="/admin/payouts">Money to move</a><a href="/admin/disputes">Disputes</a><a href="/admin/users">Users</a></div>
      </nav>
      <main style={{ maxWidth: 780, margin: '1.5rem auto', padding: '0 1.5rem 4rem' }}>
        <h1 style={{ fontSize: '1.7rem' }}>Messages</h1>
        <p className="zemba-muted">Messages from the Contact page and suggestions from visitors.</p>
        {messages === null && <p className="zemba-muted">Loading…</p>}
        {messages !== null && messages.length === 0 && <div className="zemba-card zemba-empty"><p>No messages yet.</p></div>}
        {(messages || []).map((m) => (
          <section key={m.id} className="zemba-card" style={{ padding: '1.1rem', marginTop: '0.9rem', opacity: m.status === 'DONE' ? 0.65 : 1 }}>
            <div className="zemba-review-top">
              <strong>{m.subject}</strong>
              <span className={`zemba-pill ${m.status === 'NEW' ? 'wait' : 'ok'}`}>{m.status === 'NEW' ? 'New' : 'Done'}</span>
            </div>
            <p style={{ whiteSpace: 'pre-wrap', margin: '0.6rem 0' }}>{m.message}</p>
            <small className="zemba-muted">{new Date(m.created_at).toLocaleString()}{m.full_name ? ` · account: ${m.full_name} (${m.email})` : ''}</small>
            <div style={{ marginTop: '0.6rem' }}>
              <button className="zemba-btn zemba-btn-secondary" style={{ padding: '0.35rem 0.9rem', fontSize: '0.82rem' }} onClick={() => setStatus(m.id, m.status === 'NEW' ? 'DONE' : 'NEW')}>{m.status === 'NEW' ? 'Mark as done' : 'Reopen'}</button>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
