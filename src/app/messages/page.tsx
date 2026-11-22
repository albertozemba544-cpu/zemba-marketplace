'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';
import MessagesPanel from '@/components/MessagesPanel';

interface Thread { key: string; reference: string | null; product_id: string | null; buyer_id: string; title: string; other_name: string; last_body: string; last_at: string; last_mine: boolean; unread: number }

export default function MessagesPage() {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);

  useEffect(() => {
    fetch('/api/messages/inbox', { cache: 'no-store' }).then(async (response) => {
      if (response.status === 401) { setNeedLogin(true); return; }
      if (response.status === 403) { setThreads([]); return; } // admin accounts do not have buyer/seller messages
      const data = await response.json().catch(() => ({}));
      setThreads(data.threads || []);
    });
  }, []);

  return (
    <>
      <SkyBackground />
      <main className="zemba-page">
        <div className="zemba-card" style={{ maxWidth: 640, margin: '2rem auto', padding: '1.4rem' }}>
          <h1 style={{ marginTop: 0 }}>Messages</h1>
          <p className="zemba-muted">Chat with buyers and sellers here. Zemba passes every message on by email and WhatsApp, so your phone number and email stay private.</p>
          {needLogin && <p><a href="/login">Log in</a> to see your messages.</p>}
          {threads === null && !needLogin && <p className="zemba-muted">Loading…</p>}
          {threads && threads.length === 0 && <p className="zemba-muted">No conversations yet. Open any product and choose “Ask the seller”, or open one of your orders.</p>}
          {threads?.map((t) => (
            <div key={t.key} style={{ borderTop: '1px solid #e4ece7', padding: '0.8rem 0' }}>
              <button type="button" onClick={() => setOpen(open === t.key ? null : t.key)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>{t.title}{t.reference ? ` · order #${t.reference}` : ''}</strong>
                  {t.unread > 0 && <span style={{ background: '#12894d', color: '#fff', borderRadius: 999, padding: '0 8px', fontSize: 12 }}>{t.unread} new</span>}
                </div>
                <div className="zemba-muted" style={{ fontSize: 13 }}>with {t.other_name} · {new Date(t.last_at).toLocaleDateString()}</div>
                <div style={{ fontSize: 14, color: '#3f5a4c', marginTop: 2 }}>{t.last_mine ? 'You: ' : ''}{t.last_body.length > 90 ? `${t.last_body.slice(0, 90)}…` : t.last_body}</div>
              </button>
              {open === t.key && (t.reference
                ? <MessagesPanel order={t.reference} heading={`Messages with ${t.other_name}`} />
                : <MessagesPanel product={t.product_id || undefined} buyer={t.buyer_id} heading={`Messages with ${t.other_name}`} />)}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
