'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SkyBackground from '@/components/SkyBackground';
import OrderProtectionActions from '@/components/OrderProtectionActions';
import DisputePanel from '@/components/DisputePanel';
import { SITE } from '@/lib/site';

const STATUS_COPY: Record<string, string> = {
  PENDING_PAYMENT: 'Waiting for payment',
  FUNDS_SECURED: 'Funds secured in escrow — waiting for delivery',
  DISPATCHED: 'Item dispatched — confirm delivery to release funds',
  PENDING_ADMIN_REVIEW: 'Transit window expired — pending admin review',
  COMPLETED: 'Completed — funds released to seller',
  REFUNDED: 'Refunded to buyer',
  DISPUTED: 'Under dispute review',
};

export default function OrderStatus() {
  const params = useParams();
  const reference = params.reference as string;
  const [order, setOrder] = useState<any>(null);
  const [loadError, setLoadError] = useState('');
  const [dispute, setDispute] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const loadOrder = useCallback(async () => {
    const response = await fetch(`/api/orders/${reference}`);
    if (response.status === 401) { window.location.href = '/login'; return; }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setLoadError(data.error || 'Order not found'); return; }
    setOrder(data);
    const disputeResponse = await fetch(`/api/orders/disputes?order_id=${reference}`);
    setDispute(disputeResponse.ok ? await disputeResponse.json() : null);
  }, [reference]);

  useEffect(() => {
    const stored = localStorage.getItem('zemba_user');
    if (stored) setUser(JSON.parse(stored));
    loadOrder();
  }, [loadOrder]);

  if (loadError) return <div style={{ textAlign: 'center', padding: '2rem', color: '#fff' }}>{loadError}. <a href="/browse" style={{ color: '#FFD37A' }}>Back to shopping</a></div>;
  if (!order) return <div style={{ textAlign: 'center', padding: '2rem', color: '#fff' }}>Loading...</div>;

  const isBuyer = !!user && order.customer_id === user.id;

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <nav className="zemba-nav"><a href="/browse" className="brand">Zemba Marketplace</a></nav>
        <main style={{ position: 'relative', zIndex: 1, maxWidth: 480, margin: '3rem auto', padding: '0 1.5rem' }}>
          <div className="zemba-card" style={{ padding: '2rem' }}>
            <p style={{ color: 'rgba(255,255,255,0.75)' }}>Order #{order.order_reference}{order.title ? ` — ${order.title}` : ''}</p>
            <p style={{ color: '#fff', fontSize: '2rem', margin: '0.3rem 0' }}>K{Number(order.amount).toFixed(2)}</p>
            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 999, background: 'rgba(255,211,122,0.25)', color: '#FFD37A', fontSize: 13 }}>
              {STATUS_COPY[order.status] ?? order.status}
            </span>

            {(order.carrier_name || order.delivery_town) && (
              <div className="zemba-ship">
                <strong>Shipping</strong>
                {order.delivery_town && <p>Sending to: {order.receiver_name} · {order.delivery_town}{order.receiver_phone ? ` · ${order.receiver_phone}` : ''}</p>}
                {order.carrier_name ? (
                  <>
                    <p>Sent with <b>{order.carrier_name}</b></p>
                    {order.waybill_number && <p>Waybill number: <b>{order.waybill_number}</b></p>}
                    {order.pickup_point && <p>Collect at: <b>{order.pickup_point}</b></p>}
                    <p className="zemba-muted">Expected within about {order.timeout_days} days of dispatch. Take your phone and the delivery code when you collect it.</p>
                    {order.waybill_image_url && <a href={order.waybill_image_url} target="_blank" rel="noopener noreferrer"><img className="zemba-proof" src={order.waybill_image_url} alt="Proof of dispatch from the seller" /></a>}
                  </>
                ) : <p className="zemba-muted">The seller has not dispatched it yet.</p>}
              </div>
            )}

            {isBuyer && order.status === 'PENDING_PAYMENT' && <PaymentAction reference={order.order_reference} onDone={loadOrder} />}

            {isBuyer && (order.status === 'FUNDS_SECURED' || order.status === 'DISPATCHED') && (
              <DeliveryAction reference={order.order_reference} deliveryCode={order.delivery_code} onDone={loadOrder} />
            )}

            <DisputePanel order={order} dispute={dispute} user={user} onChanged={loadOrder} />

            {isBuyer && <OrderProtectionActions orderId={order.id} status={order.status} onChanged={loadOrder} />}

            <p style={{ marginTop: '2rem', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Zemba Marketplace is owned and operated by {SITE.legalName}.</p>
          </div>
        </main>
      </div>
    </>
  );
}

function PaymentAction({ reference, onDone }: { reference: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const response = await fetch(`/api/orders/${reference}/pay`, { method: 'POST' });
    setBusy(false);
    if (response.ok) onDone();
    else setError((await response.json().catch(() => ({}))).error || 'Payment failed');
  }

  return (
    <form onSubmit={pay} style={{ marginTop: '1.6rem' }}>
      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>Choose mobile money to secure this order in escrow.</p>
      <button className="zemba-btn zemba-btn-primary" style={{ width: '100%' }} disabled={busy}>{busy ? 'Processing…' : 'Pay with MTN / Airtel Money'}</button>
      <small style={{ display: 'block', marginTop: '0.6rem', color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Demo payment: this secures funds without charging a real wallet.</small>
      {error && <p style={{ color: '#FFD9D9', fontSize: '0.85rem' }}>⚠ {error}</p>}
    </form>
  );
}

function DeliveryAction({ reference, deliveryCode, onDone }: { reference: string; deliveryCode?: string; onDone: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const response = await fetch(`/api/orders/${reference}/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    setBusy(false);
    if (response.ok) onDone();
    else setError((await response.json().catch(() => ({}))).error || 'Could not confirm delivery');
  }

  return (
    <form onSubmit={confirm} style={{ marginTop: '1.6rem' }}>
      {deliveryCode && (
        <div style={{ padding: '0.8rem', marginBottom: '1rem', background: 'rgba(255,211,122,0.12)', borderRadius: 8, border: '1px solid rgba(255,211,122,0.3)' }}>
          <small style={{ color: 'rgba(255,255,255,0.75)' }}>Your delivery code — only use it once you have the item in your hands:</small>
          <div style={{ color: '#FFD37A', fontSize: '1.6rem', letterSpacing: 4, fontWeight: 700 }}>{deliveryCode}</div>
        </div>
      )}
      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>Received your item? Enter the delivery code to release payment.</p>
      <input className="zemba-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Delivery code" required inputMode="numeric" />
      <button className="zemba-btn zemba-btn-primary" style={{ width: '100%' }} disabled={busy}>{busy ? 'Confirming…' : 'Confirm Delivery'}</button>
      {error && <p style={{ color: '#FFD9D9', fontSize: '0.85rem' }}>⚠ {error}</p>}
    </form>
  );
}
