'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '', website: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus('sending');
    setError('');
    const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (response.ok) {
      setStatus('sent');
      setForm({ name: '', phone: '', email: '', message: '', website: '' });
    } else {
      setStatus('error');
      setError((await response.json().catch(() => ({}))).error || 'Could not send your message. Please try again.');
    }
  }

  if (status === 'sent') {
    return <div className="zemba-contact-form"><h2>Thank you!</h2><p>We received your message and will reply as soon as we can.</p></div>;
  }

  return (
    <form className="zemba-contact-form" onSubmit={submit}>
      <h2>Send us a message</h2>
      <label>Your name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} /></label>
      <div className="zemba-contact-row">
        <label>Phone number<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} inputMode="tel" /></label>
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={150} /></label>
      </div>
      <label>How can we help?<textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required minLength={5} maxLength={2000} /></label>
      {/* hidden trap field for spam bots - real visitors never see or fill it */}
      <input className="zemba-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
      {status === 'error' && <div className="zemba-form-error">{error}</div>}
      <button className="zemba-retail-cta" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send message'} <span>→</span></button>
      <small>Please give a phone number or an email so we can reply.</small>
    </form>
  );
}
