'use client';

import { FormEvent, useState } from 'react';

interface ChatMessage { from: 'bot' | 'user'; text: string; }

export default function SiteAssistant() {
  const [open, setOpen] = useState(false);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [notice, setNotice] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([{ from: 'bot', text: 'Hi! I can help with shopping, payments, reviews, sellers, delivery, and your account.' }]);

  async function ask(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    const text = message.trim();
    setMessages((current) => [...current, { from: 'user', text }]);
    setMessage('');
    const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }) });
    const data = await response.json();
    setMessages((current) => [...current, { from: 'bot', text: data.answer }]);
  }

  async function sendSuggestion(event: FormEvent) {
    event.preventDefault();
    const stored = localStorage.getItem('zemba_user');
    const response = await fetch('/api/suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: stored ? JSON.parse(stored).id : undefined, subject, message: suggestion }) });
    const data = await response.json();
    setNotice(response.ok ? 'Thanks. Your suggestion was sent.' : data.error || 'Something went wrong.');
    if (response.ok) { setSubject(''); setSuggestion(''); }
  }

  return <>
    <button className="zemba-assistant-launcher" onClick={() => setOpen((value) => !value)} aria-label="Open Zemba help chat">{open ? '×' : '✦'}<span>{open ? 'Close' : 'Help'}</span></button>
    {open && <section className="zemba-assistant-panel" aria-label="Zemba help chat"><header><div><strong>Zemba help</strong><small>Usually replies instantly</small></div><button onClick={() => setOpen(false)} aria-label="Close chat">×</button></header><div className="zemba-chat-messages">{messages.map((item, index) => <p key={`${item.from}-${index}`} className={item.from}>{item.text}</p>)}</div><form onSubmit={ask} className="zemba-chat-form"><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask a question..." aria-label="Chat message" /><button aria-label="Send question">→</button></form><button className="zemba-suggestion-link" onClick={() => setSuggestionOpen(true)}>Have an idea? Send a suggestion</button></section>}
    {suggestionOpen && <div className="zemba-modal-backdrop" role="presentation"><section className="zemba-suggestion-modal" role="dialog" aria-modal="true" aria-labelledby="suggestion-title"><button className="zemba-modal-close" onClick={() => setSuggestionOpen(false)} aria-label="Close suggestion form">×</button><p className="zemba-retail-eyebrow">Help us improve</p><h2 id="suggestion-title">Suggestion box</h2><p>Tell us what would make Zemba better for you.</p><form onSubmit={sendSuggestion}><label>Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} required maxLength={120} /></label><label>Your suggestion<textarea value={suggestion} onChange={(event) => setSuggestion(event.target.value)} required maxLength={2000} rows={5} /></label><button className="zemba-retail-cta">Send suggestion <span>→</span></button></form>{notice && <div className="zemba-form-notice">{notice}</div>}</section></div>}
  </>;
}
