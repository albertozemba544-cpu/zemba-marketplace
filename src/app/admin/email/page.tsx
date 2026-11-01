'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';
import AdminNav from '@/components/AdminNav';

export default function AdminEmail() {
  const [info, setInfo] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  // update to many people
  const [kind, setKind] = useState('NEWS');
  const [audience, setAudience] = useState('ALL');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [progress, setProgress] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  // message to one person
  const [search, setSearch] = useState('');
  const [pickedId, setPickedId] = useState('');
  const [oneSubject, setOneSubject] = useState('');
  const [oneBody, setOneBody] = useState('');
  const [oneMessage, setOneMessage] = useState('');

  function load() {
    fetch('/api/admin/broadcast').then((r) => {
      if (r.status === 401 || r.status === 403) { window.location.href = '/admin/login'; return null; }
      return r.json();
    }).then((d) => { if (d) setInfo(d); });
  }
  useEffect(() => {
    load();
    fetch('/api/admin/overview').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setUsers((d.users || []).filter((u: any) => u.role !== 'admin')); });
  }, []);

  const count = info ? info.counts[`${kind}_${audience}`] ?? 0 : 0;

  async function post(url: string, payload: any) {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return { ok: response.ok, data: await response.json().catch(() => ({})) };
  }

  async function runSending(id: string) {
    setSending(true);
    for (let i = 0; i < 500; i++) {
      const { ok, data } = await post('/api/admin/broadcast/send', { broadcast_id: id });
      if (!ok) { setProgress(data.error || 'Sending stopped. Press Resume to continue.'); break; }
      setProgress(`Sent ${data.sent} · failed ${data.failed} · still to send ${data.remaining}`);
      if (data.remaining === 0) { setProgress(`Finished. Sent ${data.sent}${data.failed ? `, failed ${data.failed} (use "Retry failed" below)` : ''}.`); break; }
      await new Promise((r) => setTimeout(r, 300));
    }
    setSending(false);
    load();
  }

  async function test() {
    setMessage('');
    const { ok, data } = await post('/api/admin/broadcast', { action: 'test', kind, audience, subject, body, button_text: buttonText, button_url: buttonUrl });
    setMessage(ok ? 'A test email was sent to your own address.' : data.error || 'The test could not be sent.');
  }

  async function sendAll() {
    setMessage('');
    if (!confirm(`Send this email to ${count} people? You cannot undo it.`)) return;
    const { ok, data } = await post('/api/admin/broadcast', { kind, audience, subject, body, button_text: buttonText, button_url: buttonUrl });
    if (!ok) { setMessage(data.error || 'Could not start sending.'); return; }
    setSubject(''); setBody(''); setButtonText(''); setButtonUrl('');
    if (data.total === 0) { setMessage('Nobody matched this audience, so nothing was sent.'); load(); return; }
    await runSending(data.broadcast_id);
  }

  async function retry(id: string) {
    await post('/api/admin/broadcast', { action: 'retry_failed', broadcast_id: id });
    await runSending(id);
  }

  async function sendOne(event: React.FormEvent) {
    event.preventDefault();
    setOneMessage('Sending…');
    const { ok, data } = await post('/api/admin/email-user', { user_id: pickedId, subject: oneSubject, body: oneBody });
    if (ok) { setOneMessage('Sent.'); setOneSubject(''); setOneBody(''); } else setOneMessage(data.error || 'Could not send.');
  }

  const matches = users.filter((u) => !search || `${u.full_name} ${u.business_name || ''} ${u.email}`.toLowerCase().includes(search.toLowerCase())).slice(0, 8);
  const picked = users.find((u) => u.id === pickedId);

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <AdminNav />
        <main style={{ maxWidth: 820, margin: '1.5rem auto', padding: '0 1.5rem 4rem' }}>
          <h1 style={{ fontSize: '1.7rem', margin: 0 }}>Email users</h1>
          {info && !info.email_ready && <div className="zemba-form-error">Email is not set up yet. Add the Brevo settings in Vercel first, then these tools will work.</div>}

          <section className="zemba-card" style={{ padding: '1.4rem', marginTop: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>Send an update to many people</h3>
            <label className="zemba-field">What kind of email is it?
              <select className="zemba-input" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="NEWS">News and offers — only people who chose to receive them</option>
                <option value="SERVICE">Important update (rules changed, safety) — every active user</option>
              </select>
            </label>
            <label className="zemba-field">Who gets it?
              <select className="zemba-input" value={audience} onChange={(e) => setAudience(e.target.value)}>
                <option value="ALL">Buyers and sellers</option>
                <option value="BUYERS">Buyers only</option>
                <option value="SELLERS">Sellers only</option>
              </select>
            </label>
            <p className="zemba-muted">This will go to <strong>{count}</strong> people. Marketing emails should only go to people who agreed to receive them, and each news email has an unsubscribe link. Brevo&apos;s free plan sends about 300 emails a day. If you pass the limit, press &quot;Retry failed&quot; tomorrow.</p>
            <input className="zemba-input" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} />
            <textarea className="zemba-input" rows={8} placeholder={'Write your message. Leave an empty line between paragraphs.\nEach person is greeted by their first name.'} value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="zemba-two-col">
              <input className="zemba-input" placeholder="Button label (optional)" value={buttonText} onChange={(e) => setButtonText(e.target.value)} maxLength={60} />
              <input className="zemba-input" placeholder="Button link starting with https:// (optional)" value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} />
            </div>
            {message && <div className="zemba-legal-note">{message}</div>}
            {progress && <div className="zemba-legal-note">{progress}</div>}
            <div className="zemba-actions">
              <button className="zemba-btn zemba-btn-secondary" onClick={test} disabled={sending || !subject || !body}>Send me a test first</button>
              <button className="zemba-btn zemba-btn-primary" onClick={sendAll} disabled={sending || !subject || !body || count === 0}>{sending ? 'Sending… keep this page open' : `Send to ${count} people`}</button>
            </div>
          </section>

          <section className="zemba-card" style={{ padding: '1.4rem', marginTop: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>Message one person</h3>
            <p className="zemba-muted">For example: tell someone why they were suspended, or answer a problem.</p>
            <input className="zemba-input" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="zemba-pick-list">
              {matches.map((u) => (
                <button type="button" key={u.id} className={u.id === pickedId ? 'active' : ''} onClick={() => setPickedId(u.id)}>{u.business_name || u.full_name} — {u.email} <small>({u.role})</small></button>
              ))}
            </div>
            {picked && <p><strong>To:</strong> {picked.full_name} ({picked.email})</p>}
            <form onSubmit={sendOne}>
              <input className="zemba-input" placeholder="Subject" value={oneSubject} onChange={(e) => setOneSubject(e.target.value)} maxLength={150} required />
              <textarea className="zemba-input" rows={6} placeholder="Your message" value={oneBody} onChange={(e) => setOneBody(e.target.value)} required />
              {oneMessage && <p className="zemba-muted">{oneMessage}</p>}
              <button className="zemba-btn zemba-btn-primary" disabled={!pickedId}>Send message</button>
            </form>
          </section>

          <h3 style={{ marginTop: '1.6rem' }}>Sent updates</h3>
          {info && info.history.length === 0 && <p className="zemba-muted">Nothing sent yet.</p>}
          {info && info.history.map((b: any) => (
            <div key={b.id} className="zemba-card zemba-flag-card">
              <div><strong>{b.subject}</strong><br /><span className="zemba-muted">{b.kind === 'NEWS' ? 'News' : 'Important update'} · {b.audience.toLowerCase()} · {new Date(b.created_at).toLocaleString()} · sent {b.sent} of {b.total}{b.failed ? ` · ${b.failed} failed` : ''}</span></div>
              <div className="zemba-actions">
                {b.pending > 0 && <button className="zemba-btn zemba-btn-primary" disabled={sending} onClick={() => runSending(b.id)}>Resume sending ({b.pending} left)</button>}
                {b.failed > 0 && <button className="zemba-btn zemba-btn-secondary" disabled={sending} onClick={() => retry(b.id)}>Retry failed</button>}
              </div>
            </div>
          ))}
        </main>
      </div>
    </>
  );
}
