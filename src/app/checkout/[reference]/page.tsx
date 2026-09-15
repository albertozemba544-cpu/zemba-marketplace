'use client';

import { useEffect, useState } from 'react';
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
  const [dispute, setDispute] = useState<any>(null);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeMessage, setDisputeMessage] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('zemba_user');
    if (stored) setUser(JSON.parse(stored));

    // Fetch order
    fetch(`/api/orders/${reference}`)
      .then((r) => r.json())
      .then((d) => setOrder(d));

    // Fetch dispute if exists
    fetch(`/api/orders/disputes?order_id=${reference}`)
      .then((r) => r.json())
      .then((d) => {
        if (d) setDispute(d);
      });
  }, [reference]);

  async function fileDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !disputeReason) return;

    const response = await fetch('/api/orders/disputes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: order.id,
        buyer_id: user.id,
        seller_id: order.seller_id,
        reason: disputeReason,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      setDisputeReason('');
      setShowDisputeForm(false);
      // Refetch dispute
      fetch(`/api/orders/disputes?order_id=${order.id}`)
        .then((r) => r.json())
        .then((d) => setDispute(d));
    }
  }

  async function postMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage || !dispute || !user) return;

    const response = await fetch('/api/orders/disputes/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dispute_id: dispute.id,
        sender_id: user.id,
        message: newMessage,
      }),
    });

    if (response.ok) {
      setNewMessage('');
      // Refetch dispute with updated messages
      fetch(`/api/orders/disputes?order_id=${order.id}`)
        .then((r) => r.json())
        .then((d) => setDispute(d));
    }
  }

  if (!order) return <div style={{ textAlign: 'center', padding: '2rem', color: '#fff' }}>Loading...</div>;

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <nav className="zemba-nav"><a href="/browse" className="brand">Zemba Marketplace</a></nav>
        <main style={{ position: 'relative', zIndex: 1, maxWidth: 480, margin: '3rem auto', padding: '0 1.5rem' }}>
          <div className="zemba-card" style={{ padding: '2rem' }}>
            <p style={{ color: 'rgba(255,255,255,0.75)' }}>Order #{order.order_reference}</p>
            <p style={{ color: '#fff', fontSize: '2rem', margin: '0.3rem 0' }}>K{order.amount.toFixed(2)}</p>
            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 999, background: 'rgba(255,211,122,0.25)', color: '#FFD37A', fontSize: 13 }}>
              {STATUS_COPY[order.status] ?? order.status}
            </span>

            {order.status === 'PENDING_PAYMENT' && <PaymentAction reference={order.order_reference} />}

            {(order.status === 'FUNDS_SECURED' || order.status === 'DISPATCHED') && <DeliveryAction reference={order.order_reference} />}

            {/* Dispute Section */}
            {!dispute && (order.status === 'FUNDS_SECURED' || order.status === 'DISPATCHED') && (
              <div style={{ marginTop: '1.6rem', padding: '1rem', background: 'rgba(255,211,122,0.1)', borderRadius: 8, border: '1px solid rgba(255,211,122,0.2)' }}>
                <p style={{ color: '#FFD37A', fontSize: '0.9rem', margin: 0 }}>Something wrong with this order?</p>
                <button
                  type="button"
                  className="zemba-btn zemba-btn-secondary"
                  onClick={() => setShowDisputeForm(true)}
                  style={{ marginTop: '0.6rem', width: '100%' }}
                >
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
                <button className="zemba-btn zemba-btn-primary" style={{ width: '100%', marginTop: '0.6rem' }}>
                  Submit dispute
                </button>
                <button
                  type="button"
                  className="zemba-btn zemba-btn-secondary"
                  onClick={() => setShowDisputeForm(false)}
                  style={{ width: '100%', marginTop: '0.4rem' }}
                >
                  Cancel
                </button>
              </form>
            )}

            {dispute && (
              <div style={{ marginTop: '1.6rem', padding: '1rem', background: 'rgba(255,211,122,0.1)', borderRadius: 8, border: '1px solid rgba(255,211,122,0.2)' }}>
                <p style={{ color: '#FFD37A', fontSize: '0.9rem', marginTop: 0 }}>Dispute Status: {dispute.status}</p>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', margin: '0.4rem 0' }}><strong>Reason:</strong> {dispute.reason}</p>
                {dispute.admin_decision && (
                  <p style={{ color: 'rgba(255,211,122,0.9)', fontSize: '0.85rem' }}><strong>Admin Decision:</strong> {dispute.admin_decision}</p>
                )}
                <div style={{ marginTop: '0.8rem', maxHeight: 200, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '0.6rem', borderRadius: 4 }}>
                  {dispute.messages && dispute.messages.map((msg: any) => (
                    <div key={msg.id} style={{ marginBottom: '0.4rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                      <strong style={{ color: '#FFD37A' }}>{msg.sender_id === user?.id ? 'You' : 'Seller'}</strong>: {msg.message}
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{new Date(msg.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                {dispute.status === 'OPEN' && (
                  <form onSubmit={postMessage} style={{ marginTop: '0.8rem', display: 'flex', gap: '0.4rem' }}>
                    <input
                      className="zemba-input"
                      placeholder="Add a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      style={{ flex: 1, margin: 0 }}
                    />
                    <button className="zemba-btn zemba-btn-primary" style={{ flex: 0 }}>Send</button>
                  </form>
                )}
              </div>
            )}

            <OrderProtectionActions orderId={order.id} customerId={order.customer_id} status={order.status} />

            <p style={{ marginTop: '2rem', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              Powered by Zemba Tech escrow.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}

function PaymentAction({ reference }: { reference: string }) {
  return <form action={`/api/orders/${reference}/pay`} method="post" style={{ marginTop: '1.6rem' }}>
    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>Choose mobile money to secure this order in escrow.</p>
    <button className="zemba-btn zemba-btn-primary" style={{ width: '100%' }}>Pay with MTN / Airtel Money</button>
    <small style={{ display: 'block', marginTop: '0.6rem', color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Local demo payment: this immediately secures funds without charging a real wallet.</small>
  </form>;
}

function DeliveryAction({ reference }: { reference: string }) {
  return <form action={`/api/orders/${reference}/release`} method="post" style={{ marginTop: '1.6rem' }}>
    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>Received your item? Enter the delivery code to release payment.</p>
    <input className="zemba-input" name="code" placeholder="Delivery code" required />
    <button className="zemba-btn zemba-btn-primary" style={{ width: '100%' }}>Confirm Delivery</button>
  </form>;
}
