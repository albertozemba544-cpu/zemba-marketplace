'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SkyBackground from '@/components/SkyBackground';
import OrderProtectionActions from '@/components/OrderProtectionActions';
import DisputePanel from '@/components/DisputePanel';
import { SITE } from '@/lib/site';
import { kwacha } from '@/lib/fees';
import MessagesPanel from '@/components/MessagesPanel';

const STATUS_COPY: Record<string, string> = {
  PENDING_PAYMENT: 'Waiting for payment',
  FUNDS_SECURED: 'Funds secured in escrow — waiting for delivery',
  DISPATCHED: 'Item dispatched — confirm delivery to release the payment',
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
            <p style={{ color: '#fff', fontSize: '2rem', margin: '0.3rem 0' }}>K{Number((isBuyer ? order.total_amount : order.amount) ?? order.amount).toFixed(2)}</p>
            {isBuyer && order.buyer_fee !== undefined && (
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, margin: '0 0 0.6rem' }}>
                Item K{Number(order.amount).toFixed(2)}{Number(order.shipping_amount) > 0 ? ` + shipping K${Number(order.shipping_amount).toFixed(2)}` : ''} + buyer protection fee K{Number(order.buyer_fee).toFixed(2)}
              </p>
            )}
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
                    {order.status === 'DISPATCHED' && order.auto_release_at && (
                      <p style={{ background: 'rgba(244,189,79,0.18)', padding: '0.6rem 0.8rem', borderRadius: 8 }}>
                        {isBuyer
                          ? <>Check your item and enter your delivery code. If you do nothing and do not open a dispute, your payment is released to the seller automatically on <b>{new Date(order.auto_release_at).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lusaka' })}</b>.</>
                          : <>If the buyer does not report a problem, the payment is released to you automatically on <b>{new Date(order.auto_release_at).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lusaka' })}</b>.</>}
                      </p>
                    )}
                    {order.waybill_image_url && <a href={order.waybill_image_url} target="_blank" rel="noopener noreferrer"><img className="zemba-proof" src={order.waybill_image_url} alt="Proof of dispatch from the seller" /></a>}
                  </>
                ) : <p className="zemba-muted">The seller has not dispatched it yet.</p>}
              </div>
            )}

            {isBuyer && order.status === 'REFUNDED' && order.cancel_refund !== undefined && (
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: '0.8rem' }}>
                {order.cancelled
                  ? `You cancelled this order before dispatch. Your refund is ${kwacha(order.cancel_refund)} (the item price less the cancellation fee of ${kwacha(order.cancel_fee)}, plus the shipping you paid).`
                  : `Your refund is the full amount you paid, ${kwacha(order.total_amount)}, including the buyer protection fee.`}
              </p>
            )}

            {isBuyer && order.status === 'PENDING_PAYMENT' && <PaymentAction reference={order.order_reference} mode={order.payment_mode} onDone={loadOrder} />}

            {isBuyer && (order.status === 'FUNDS_SECURED' || order.status === 'DISPATCHED') && (
              <DeliveryAction reference={order.order_reference} deliveryCode={order.delivery_code} onDone={loadOrder} />
            )}

            {isBuyer && order.status === 'FUNDS_SECURED' && <CancelAction reference={order.order_reference} fee={order.cancel_fee} refund={order.cancel_refund} buyerFee={order.buyer_fee} onDone={loadOrder} />}

            <DisputePanel order={order} dispute={dispute} user={user} onChanged={loadOrder} />

            {user && (isBuyer || user.id === order.seller_id || user.role === 'admin') && <MessagesPanel order={order.order_reference} tone="dark" />}

            {isBuyer && <OrderProtectionActions orderId={order.id} status={order.status} onChanged={loadOrder} />}

            <p style={{ marginTop: '2rem', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Zemba Marketplace is owned and operated by {SITE.legalName}.</p>
          </div>
        </main>
      </div>
    </>
  );
}

function PaymentAction({ reference, mode, onDone }: { reference: string; mode?: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [waiting, setWaiting] = useState('');
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState('MTN');

  // while the provider confirms the payment, ask every few seconds
  async function waitForPayment() {
    for (let i = 0; i < 40; i++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const response = await fetch(`/api/orders/${reference}/payment-status`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (data.status === 'FUNDS_SECURED') { setWaiting(''); onDone(); return; }
      if (data.status === 'FAILED') { setWaiting(''); setError('The payment was not completed. Please try again.'); return; }
    }
    setWaiting('We are still waiting for your payment to be confirmed. This page will update once it arrives. You can also refresh in a minute.');
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const response = await fetch(`/api/orders/${reference}/pay`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, network }) });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setError(data.error || 'Payment failed'); return; }
    if (data.status === 'FUNDS_SECURED') { onDone(); return; }
    if (data.redirect_url) { window.location.href = data.redirect_url; return; }
    setWaiting(data.instructions || 'Approve the payment on your phone. We are waiting for confirmation.');
    waitForPayment();
  }

  if (mode === 'off') {
    return <p style={{ marginTop: '1.4rem', color: 'rgba(255,255,255,0.85)' }}>Online payment is opening soon. Your order is saved, and you will be able to pay for it here as soon as payments start.</p>;
  }

  return (
    <form onSubmit={pay} style={{ marginTop: '1.6rem' }}>
      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>Choose mobile money to secure this order in escrow.</p>
      {mode === 'provider' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <select value={network} onChange={(e) => setNetwork(e.target.value)} style={{ padding: '0.6rem', borderRadius: 8, border: '1px solid #cfdad3', font: 'inherit' }}>
            <option value="MTN">MTN</option><option value="AIRTEL">Airtel</option><option value="ZAMTEL">Zamtel</option>
          </select>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" required placeholder="Mobile money number" style={{ flex: 1, minWidth: 0, padding: '0.6rem', borderRadius: 8, border: '1px solid #cfdad3', font: 'inherit' }} />
        </div>
      )}
      <button className="zemba-btn zemba-btn-primary" style={{ width: '100%' }} disabled={busy || !!waiting}>{busy ? 'Processing…' : waiting ? 'Waiting for confirmation…' : 'Pay with mobile money'}</button>
      {mode === 'demo' && <small style={{ display: 'block', marginTop: '0.6rem', color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Demo payment: this secures funds without charging a real wallet.</small>}
      {waiting && <p style={{ color: '#FFE9B0', fontSize: '0.88rem' }}>{waiting}</p>}
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

function CancelAction({ reference, fee, refund, buyerFee, onDone }: { reference: string; fee: number; refund: number; buyerFee: number; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function cancel() {
    setBusy(true);
    setError('');
    const response = await fetch(`/api/orders/${reference}/cancel`, { method: 'POST' });
    setBusy(false);
    if (response.ok) { setOpen(false); onDone(); }
    else setError((await response.json().catch(() => ({}))).error || 'Could not cancel this order');
  }

  return (
    <div style={{ marginTop: '1.2rem' }}>
      {!open ? (
        <button type="button" className="zemba-btn zemba-btn-secondary" style={{ width: '100%' }} onClick={() => setOpen(true)}>Cancel this order</button>
      ) : (
        <div style={{ padding: '0.9rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)' }}>
          <p style={{ color: '#fff', margin: '0 0 0.5rem', fontWeight: 600 }}>Cancel before the seller sends it?</p>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem', margin: '0 0 0.7rem' }}>
            You will be refunded <strong>{kwacha(refund)}</strong>: the item price less a cancellation fee of {kwacha(fee)} ({SITE.cancelFeePercent}% of the item price, minimum {kwacha(SITE.cancelFeeMin)}), plus any shipping you paid. The buyer protection fee of {kwacha(buyerFee)} is not refunded. After the seller sends the order it can no longer be cancelled.
          </p>
          <button type="button" className="zemba-btn zemba-btn-primary" style={{ width: '100%', marginBottom: '0.5rem' }} onClick={cancel} disabled={busy}>{busy ? 'Cancelling…' : 'Yes, cancel my order'}</button>
          <button type="button" className="zemba-btn zemba-btn-secondary" style={{ width: '100%' }} onClick={() => setOpen(false)} disabled={busy}>Keep my order</button>
        </div>
      )}
      {error && <p style={{ color: '#FFD9D9', fontSize: '0.85rem' }}>⚠ {error}</p>}
    </div>
  );
}
