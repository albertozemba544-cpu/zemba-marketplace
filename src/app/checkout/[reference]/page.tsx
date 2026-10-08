'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SkyBackground from '@/components/SkyBackground';
import OrderProtectionActions from '@/components/OrderProtectionActions';

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
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [formError, setFormError] = useState('');
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

  async function fileDispute(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!disputeReason.trim()) return;
    const response = await fetch('/api/orders/disputes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: order.id, reason: disputeReason }),
    });
    if (response.ok) {
      setDisputeReason('');
      setShowDisputeForm(false);
      await loadOrder();
    } else {
      setFormError((await response.json().catch(() => ({}))).error || 'Could not submit the dispute');
    }
  }

  async function postMessage(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!newMessage.trim() || !dispute) return;
    const response = await fetch('/api/orders/disputes/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dispute_id: dispute.id, message: newMessage }),
    });
    if (response.ok) {
      setNewMessage('');
      await loadOrder();
    } else {
      setFormError((await response.json().catch(() => ({}))).error || 'Could not send the message');
    }
  }

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

            {isBuyer && !dispute && (order.status === 'FUNDS_SECURED' || order.status === 'DISPATCHED') && (
              <div style={{ marginTop: '1.6rem', padding: '1rem', background: 'rgba(255,211,122,0.1)', borderRadius: 8, border: '1px solid rgba(255,211,122,0.2)' }}>
                <p style={{ color: '#FFD37A', fontSize: '0.9rem', margin: 0 }}>Something wrong with this order?</p>
                <button type="button" className="zemba-btn zemba-btn-secondary" onClick={() => setShowDisputeForm(true)} style={{ marginTop: '0.6rem', width: '100%' }}>
                  File a dispute
                </button>
              </div>
            )}

            {showDisputeForm && !dispute && (
              <form onSubmit={fileDispute} style={{ marginTop: '1.6rem', padding: '1rem', background: 'rgba(255,211,122,0.05)', borderRadius: 8 }}>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>Tell us what went wrong:</p>
                <textarea
                  className="zemba-input"
                  placeholder="e.g., Wrong item received, Item damaged in transit, Item didn't arrive..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={3}
                  required
                />
                <button className="zemba-btn zemba-btn-primary" style={{ width: '100%', marginTop: '0.6rem' }}>Submit dispute</button>
                <button type="button" className="zemba-btn zemba-btn-secondary" onClick={() => setShowDisputeForm(false)} style={{ width: '100%', marginTop: '0.4rem' }}>Cancel</button>
              </form>
            )}

            {dispute && (
              <div style={{ marginTop: '1.6rem', padding: '1rem', background: 'rgba(255,211,122,0.1)', borderRadius: 8, border: '1px solid rgba(255,211,122,0.2)' }}>
                <p style={{ color: '#FFD37A', fontSize: '0.9rem', marginTop: 0 }}>Dispute status: {dispute.status}</p>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', margin: '0.4rem 0' }}><strong>Reason:</strong> {dispute.reason}</p>
                {dispute.admin_notes && (
                  <p style={{ color: 'rgba(255,211,122,0.9)', fontSize: '0.85rem' }}><strong>Admin decision:</strong> {dispute.admin_notes}</p>
                )}
                <div style={{ marginTop: '0.8rem', maxHeight: 200, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '0.6rem', borderRadius: 4 }}>
                  {(dispute.messages || []).length === 0 && <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>No messages yet.</div>}
                  {(dispute.messages || []).map((msg: any) => (
                    <div key={msg.id} style={{ marginBottom: '0.4rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                      <strong style={{ color: '#FFD37A' }}>{msg.sender_id === user?.id ? 'You' : msg.sender_role === 'admin' ? 'Zemba admin' : msg.sender_role === 'seller' ? 'Seller' : 'Buyer'}</strong>: {msg.message}
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{new Date(msg.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                {dispute.status === 'OPEN' && (
                  <form onSubmit={postMessage} style={{ marginTop: '0.8rem', display: 'flex', gap: '0.4rem' }}>
                    <input className="zemba-input" placeholder="Add a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} style={{ flex: 1, margin: 0 }} />
                    <button className="zemba-btn zemba-btn-primary" style={{ flex: 0 }}>Send</button>
                  </form>
                )}
              </div>
            )}

            {formError && <p style={{ color: '#FFD9D9', fontSize: '0.85rem', marginTop: '0.8rem' }}>⚠ {formError}</p>}

            {isBuyer && <OrderProtectionActions orderId={order.id} status={order.status} onChanged={loadOrder} />}

            <p style={{ marginTop: '2rem', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Powered by Zemba Tech escrow.</p>
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
