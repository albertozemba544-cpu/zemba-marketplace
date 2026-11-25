'use client';

import { useState } from 'react';
import { SITE } from '@/lib/site';

// While an order is on its way the buyer can ask for a few more days to check the item.
// The extra days are limited, because the money is never held longer than the hold limit.
export default function OrderProtectionActions({ orderId, status, onChanged }: { orderId: string; status: string; onChanged?: () => void }) {
  const [message, setMessage] = useState('');

  async function extendProtection() {
    const response = await fetch('/api/orders/extend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? `Done. Your payment will now be released on ${data.release_when}.` : data.error || 'Could not add more days.');
    if (response.ok) onChanged?.();
  }

  if (status !== 'DISPATCHED') return null;
  return (
    <div style={{ marginTop: '1rem' }}>
      <button className="zemba-btn zemba-btn-secondary" type="button" onClick={extendProtection} style={{ width: '100%' }}>
        Add {SITE.extendDays} more days to check the item
      </button>
      <small style={{ display: 'block', marginTop: 4, color: 'rgba(255,255,255,0.6)' }}>We never hold a payment longer than {SITE.maxHoldDays} days after it was made. If something is wrong, open a dispute instead.</small>
      {message && <p style={{ color: '#FFD37A', fontSize: '0.85rem' }}>{message}</p>}
    </div>
  );
}
