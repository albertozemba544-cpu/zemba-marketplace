'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// A conversation between a buyer and a seller. Zemba passes every message on by email (and WhatsApp), so nobody
// has to share a phone number or email address.

interface Msg { id: string; mine: boolean; body: string; created_at: string }

export default function MessagesPanel({ order, product, buyer, heading, tone = 'light' }: { order?: string; product?: string; buyer?: string; heading?: string; tone?: 'light' | 'dark' }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [otherName, setOtherName] = useState('');
  const [readOnly, setReadOnly] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  const qs = useCallback(() => {
    const params = new URLSearchParams();
    if (order) params.set('order', order);
    if (product) params.set('product', product);
    if (buyer) params.set('buyer', buyer);
    return params.toString();
  }, [order, product, buyer]);

  const load = useCallback(async () => {
    const response = await fetch(`/api/messages?${qs()}`, { cache: 'no-store' });
    if (response.status === 404 && product && !buyer) { setMessages([]); return; } // no conversation yet
    if (!response.ok) return;
    const data = await response.json();
    setMessages(data.messages || []);
    setOtherName(data.other_name || '');
    setReadOnly(Boolean(data.read_only));
  }, [qs, product, buyer]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000); // new messages appear without refreshing
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    setSending(true); setError(''); setNotice('');
    const response = await fetch('/api/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order, product, buyer, body: text }),
    });
    const data = await response.json().catch(() => ({}));
    setSending(false);
    if (!response.ok) { setError(data.error || 'Could not send the message'); return; }
    if (data.hidden) setNotice('For your protection, phone numbers, emails and links are hidden. Zemba passes your messages on.');
    setText('');
    load();
  }

  const dark = tone === 'dark';
  const ink = dark ? '#fff' : '#14261d';
  const muted = dark ? 'rgba(255,255,255,0.7)' : '#5a7266';

  return (
    <div style={{ marginTop: '1.2rem', padding: '1rem', borderRadius: 12, border: `1px solid ${dark ? 'rgba(255,255,255,0.25)' : '#dfe7e2'}`, background: dark ? 'rgba(255,255,255,0.06)' : '#fff', color: ink }}>
      <strong>{heading || `Messages${otherName ? ` with ${otherName}` : ''}`}</strong>
      <p style={{ margin: '0.2rem 0 0.7rem', fontSize: 12.5, color: muted }}>Zemba passes your messages on by email and WhatsApp, so your phone number and email stay private. Phone numbers, emails and links are hidden.</p>

      <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, padding: '0.2rem 0' }}>
        {messages.length === 0 && <p style={{ margin: 0, fontSize: 13.5, color: muted }}>No messages yet. {readOnly ? '' : 'Say hello and ask anything about the item or the delivery.'}</p>}
        {messages.map((m) => (
          <div key={m.id} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '0.5rem 0.7rem', borderRadius: 12, background: m.mine ? '#12894d' : dark ? 'rgba(255,255,255,0.16)' : '#eef4f0', color: m.mine ? '#fff' : ink, fontSize: 14, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {m.body}
            <div style={{ fontSize: 10.5, opacity: 0.7, marginTop: 2, textAlign: 'right' }}>{new Date(m.created_at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {!readOnly && (
        <form onSubmit={send} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Write a message…" style={{ flex: 1, padding: '0.6rem 0.7rem', borderRadius: 8, border: '1px solid #cfdad3', font: 'inherit', minWidth: 0 }} />
          <button className="zemba-btn zemba-btn-primary" disabled={sending || !text.trim()}>{sending ? '…' : 'Send'}</button>
        </form>
      )}
      {notice && <p style={{ margin: '0.5rem 0 0', fontSize: 12.5, color: dark ? '#FFE9B0' : '#8a5a00' }}>{notice}</p>}
      {error && <p style={{ margin: '0.5rem 0 0', fontSize: 12.5, color: dark ? '#FFD9D9' : '#b42318' }}>⚠ {error}</p>}
    </div>
  );
}
