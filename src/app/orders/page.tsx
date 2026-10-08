'use client';

import { useEffect, useState } from 'react';
import { statusInfo } from '@/lib/status';

interface Order { id: string; order_reference: string; title: string | null; amount: number; status: string; created_at: string; quantity: number; }

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [user, setUser] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');

  useEffect(() => {
    const stored = localStorage.getItem('zemba_user');
    if (!stored) { window.location.href = '/login'; return; }
    const u = JSON.parse(stored);
    if (u.role === 'seller') { window.location.href = '/seller/dashboard'; return; }
    if (u.role === 'admin') { window.location.href = '/admin/dashboard'; return; }
    setUser(u);
    fetch('/api/orders').then((response) => {
      if (response.status === 401 || response.status === 403) { localStorage.removeItem('zemba_user'); window.location.href = '/login'; return null; }
      return response.json();
    }).then((data) => { if (data) setOrders(data.orders || []); });
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('zemba_user');
    window.location.href = '/login';
  }

  const finished = ['COMPLETED', 'REFUNDED'];
  const visible = (orders || []).filter((o) => filter === 'all' || (filter === 'done' ? finished.includes(o.status) : !finished.includes(o.status)));

  return (
    <div className="zemba-page">
      <nav className="zemba-nav">
        <a href="/" className="brand">Zemba Marketplace</a>
        <div><a href="/browse">Shop</a><a href="/cart">Cart</a><a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>Log out</a></div>
      </nav>
      <main className="zemba-orders-main">
        <h1>My orders</h1>
        <p className="zemba-muted">{user ? `Orders for ${user.full_name}` : ''}</p>
        <div className="zemba-tabs">
          {(['all', 'open', 'done'] as const).map((key) => (
            <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{key === 'all' ? 'All' : key === 'open' ? 'In progress' : 'Finished'}</button>
          ))}
        </div>

        {orders === null && <p className="zemba-muted">Loading your orders…</p>}
        {orders !== null && visible.length === 0 && (
          <div className="zemba-card zemba-empty">
            <p>{orders.length === 0 ? 'You have not placed any orders yet.' : 'No orders in this list.'}</p>
            <a href="/browse" className="zemba-btn zemba-btn-primary">Start shopping</a>
          </div>
        )}
        {visible.map((order) => {
          const info = statusInfo(order.status);
          return (
            <a key={order.id} href={`/checkout/${order.order_reference}`} className="zemba-card zemba-order-row">
              <div>
                <strong>{order.title || 'Order'}</strong>
                <span className="zemba-muted">#{order.order_reference} · {new Date(order.created_at).toLocaleDateString()}{order.quantity > 1 ? ` · Qty ${order.quantity}` : ''}</span>
              </div>
              <div className="zemba-order-right">
                <strong>K{Number(order.amount).toFixed(2)}</strong>
                <span className={`zemba-pill ${info.tone}`}>{info.label}</span>
              </div>
            </a>
          );
        })}
      </main>
    </div>
  );
}
