'use client';

import { useState } from 'react';

const REASONS: { value: string; label: string }[] = [
  { value: 'SCAM', label: 'It looks like a scam' },
  { value: 'FAKE_ITEM', label: 'Fake or not as described' },
  { value: 'PROHIBITED', label: 'Not allowed on Zemba (illegal or unsafe)' },
  { value: 'OFF_PLATFORM', label: 'Asks me to pay or talk outside Zemba' },
  { value: 'OFFENSIVE', label: 'Rude, threatening or offensive' },
  { value: 'OTHER', label: 'Something else' },
];

// A small "Report" link that opens a form. Works for a listing (PRODUCT) or a person (USER).
export default function ReportButton({ targetType, targetId, label = 'Report' }: { targetType: 'USER' | 'PRODUCT'; targetId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('SCAM');
  const [details, setDetails] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_type: targetType, target_id: targetId, reason, details }),
    });
    setBusy(false);
    if (response.status === 401) { window.location.href = '/login'; return; }
    const data = await response.json().catch(() => ({}));
    if (response.ok) setDone(true);
    else setMessage(data.error || 'Could not send your report.');
  }

  if (done) return <p className="zemba-report-done">Thank you. Our team will look at your report.</p>;
  return (
    <div className="zemba-report">
      {!open ? (
        <button type="button" className="zemba-report-link" onClick={() => setOpen(true)}>⚑ {label}</button>
      ) : (
        <form className="zemba-report-form" onSubmit={submit}>
          <strong>What is wrong?</strong>
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <textarea rows={3} maxLength={1000} placeholder="Tell us more (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
          {message && <p className="zemba-form-error">{message}</p>}
          <div>
            <button type="submit" className="zemba-btn zemba-btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send report'}</button>{' '}
            <button type="button" className="zemba-btn zemba-btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
