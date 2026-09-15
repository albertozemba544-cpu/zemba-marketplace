'use client';

import { useState } from 'react';

export default function OrderProtectionActions({ orderId, customerId, status }: { orderId: string; customerId: string; status: string }) {
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');

  async function extendProtection() {
    const response = await fetch('/api/orders/extend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id: orderId, customer_id: customerId }) });
    const data = await response.json();
    setMessage(response.ok ? 'Protection extended by 7 days.' : data.error);
  }

  async function openDispute() {
    const response = await fetch('/api/orders/dispute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id: orderId, customer_id: customerId, reason }) });
    const data = await response.json();
    setMessage(response.ok ? 'Dispute submitted for admin review.' : data.error);
  }

  if (status !== 'DISPATCHED') return null;
  return (
    <div style={{ marginTop: '1rem' }}>
      <button className="zemba-btn zemba-btn-secondary" type="button" onClick={extendProtection} style={{ width: '100%', marginBottom: '0.7rem' }}>
        Extend protection by 7 days
      </button>
      <input className="zemba-input" placeholder="Reason for a dispute" value={reason} onChange={(e) => setReason(e.target.value)} />
      <button className="zemba-btn zemba-btn-secondary" type="button" onClick={openDispute} style={{ width: '100%' }}>Open a dispute</button>
      {message && <p style={{ color: '#FFD37A', fontSize: '0.85rem' }}>{message}</p>}
    </div>
  );
}