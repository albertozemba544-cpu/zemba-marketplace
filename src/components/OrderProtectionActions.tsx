'use client';

import { useState } from 'react';

export default function OrderProtectionActions({ orderId, status, onChanged }: { orderId: string; status: string; onChanged?: () => void }) {
  const [message, setMessage] = useState('');

  async function extendProtection() {
    const response = await fetch('/api/orders/extend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? 'Protection extended by 7 days.' : data.error || 'Could not extend protection.');
    if (response.ok) onChanged?.();
  }

  if (status !== 'DISPATCHED') return null;
  return (
    <div style={{ marginTop: '1rem' }}>
      <button className="zemba-btn zemba-btn-secondary" type="button" onClick={extendProtection} style={{ width: '100%' }}>
        Extend protection by 7 days
      </button>
      {message && <p style={{ color: '#FFD37A', fontSize: '0.85rem' }}>{message}</p>}
    </div>
  );
}
