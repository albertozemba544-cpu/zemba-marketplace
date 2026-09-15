'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [overview, setOverview] = useState<any>({ users: [], products: [], orders: [], disputes: [], events: [] });
  const [announcement, setAnnouncement] = useState({ subject: '', body: '', audience: 'ALL' });
  const [announcementMessage, setAnnouncementMessage] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('zemba_user');
    if (!stored) { window.location.href = '/admin/login'; return; }
    const u = JSON.parse(stored);
    if (u.role !== 'admin') { window.location.href = '/admin/login'; return; }

    fetch('/api/admin/overview').then((r) => r.json()).then((d) => {
      setOverview(d);
      const totalGMV = d.orders.reduce((s: number, o: any) => s + o.amount, 0);
      const totalFees = d.orders.reduce((s: number, o: any) => s + o.platform_fee, 0);
      setStats({ totalGMV, totalFees, count: d.orders.length, pendingUsers: d.users.filter((u: any) => u.approval_status === 'PENDING').length, pendingProducts: d.products.filter((p: any) => p.approval_status === 'PENDING').length });
    });
  }, []);

  async function decide(entity: 'user' | 'product', id: string, decision: 'APPROVED' | 'REJECTED') {
    await fetch('/api/admin/approval', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity, id, decision }) });
    const response = await fetch('/api/admin/overview');
    setOverview(await response.json());
  }

  async function publishAnnouncement(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch('/api/admin/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(announcement) });
    const data = await response.json();
    setAnnouncementMessage(response.ok ? `Announcement saved for ${data.recipientCount} subscribed users.` : data.error);
    if (response.ok) setAnnouncement({ subject: '', body: '', audience: 'ALL' });
  }

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <nav className="zemba-nav">
          <span className="brand">Zemba Marketplace — Admin</span>
          <div><a href="/admin/disputes">Disputes</a><a href="/admin/users">Users &amp; moderation</a></div>
        </nav>

        <main style={{ position: 'relative', zIndex: 1, maxWidth: 820, margin: '1rem auto', padding: '0 1.5rem 4rem' }}>
          {stats && (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <div className="zemba-card" style={{ padding: '1.2rem 1.6rem', flex: 1, minWidth: 160 }}>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Total orders</div>
                <div style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 700 }}>{stats.count}</div>
              </div>
              <div className="zemba-card" style={{ padding: '1.2rem 1.6rem', flex: 1, minWidth: 160 }}>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>GMV</div>
                <div style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 700 }}>K{stats.totalGMV.toFixed(2)}</div>
              </div>
              <div className="zemba-card" style={{ padding: '1.2rem 1.6rem', flex: 1, minWidth: 160 }}>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Platform fees (2.5%)</div>
                <div style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 700 }}>K{stats.totalFees.toFixed(2)}</div>
              </div>
              <div className="zemba-card" style={{ padding: '1.2rem 1.6rem', flex: 1, minWidth: 160 }}><div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Pending approvals</div><div style={{ color: '#FFD37A', fontSize: '1.6rem', fontWeight: 700 }}>{stats.pendingUsers + stats.pendingProducts}</div></div>
            </div>
          )}

          <section className="zemba-card" style={{ padding: '1.5rem', marginBottom: '1.2rem' }}>
            <h3 style={{ color: '#fff', margin: '0 0 0.8rem' }}>Account approvals</h3>
            <table className="zemba-table"><thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Details</th><th>Status</th><th>Action</th></tr></thead><tbody>
              {overview.users.map((u: any) => (
                <tr key={u.id}>
                  <td>{u.business_name || u.full_name}</td>
                  <td>{u.role}</td>
                  <td>{u.email}</td>
                  <td>
                    {u.role === 'seller' && u.approval_status === 'PENDING' && (
                      <div style={{ fontSize: '0.9rem', color: '#FFD37A' }}>
                        <div>NRC: {u.nrc_number || 'Not provided'}</div>
                        <div>Location: {u.location || 'Not provided'}</div>
                      </div>
                    )}
                    {u.role !== 'seller' && <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>—</span>}
                  </td>
                  <td>{u.approval_status}</td>
                  <td>{u.approval_status === 'PENDING' && <><button className="zemba-btn zemba-btn-primary" onClick={() => decide('user', u.id, 'APPROVED')}>Approve</button> <button className="zemba-btn zemba-btn-secondary" onClick={() => decide('user', u.id, 'REJECTED')}>Reject</button></>}</td>
                </tr>
              ))}
            </tbody></table>
          </section>

          <section className="zemba-card" style={{ padding: '1.5rem', marginBottom: '1.2rem' }}>
            <h3 style={{ color: '#fff', margin: '0 0 0.8rem' }}>Product approvals</h3>
            <table className="zemba-table"><thead><tr><th>Product</th><th>Seller</th><th>Price</th><th>Status</th><th>Action</th></tr></thead><tbody>
              {overview.products.map((p: any) => <tr key={p.id}><td>{p.title}</td><td>{p.business_name || p.seller_name}</td><td>K{p.price}</td><td>{p.approval_status}</td><td>{p.approval_status === 'PENDING' && <><button className="zemba-btn zemba-btn-primary" onClick={() => decide('product', p.id, 'APPROVED')}>Approve</button> <button className="zemba-btn zemba-btn-secondary" onClick={() => decide('product', p.id, 'REJECTED')}>Reject</button></>}</td></tr>)}
            </tbody></table>
          </section>

          <section className="zemba-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ color: '#fff', margin: '0 0 0.8rem' }}>All orders</h3>
            <table className="zemba-table">
              <thead><tr><th>Reference</th><th>Amount</th><th>Fee</th><th>Status</th><th>Dispatch proof</th></tr></thead>
              <tbody>
                {overview.orders.length === 0 && <tr><td colSpan={5} style={{ color: 'rgba(255,255,255,0.6)' }}>No orders yet.</td></tr>}
                {overview.orders.map((o: any) => (
                  <tr key={o.id}><td>{o.order_reference}</td><td>K{o.amount}</td><td>K{o.platform_fee}</td><td>{o.status}</td><td>{o.waybill_image_url ? <a href={o.waybill_image_url} target="_blank" rel="noreferrer">View proof</a> : '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="zemba-card" style={{ padding: '1.5rem', marginTop: '1.2rem' }}><h3 style={{ color: '#fff' }}>Weekly newsletter / site update</h3><p style={{ color: 'rgba(255,255,255,0.7)' }}>Subscribers: {overview.newsletterSubscribers || 0}. Compose the next Zemba update here.</p><form onSubmit={publishAnnouncement}><input className="zemba-input" placeholder="Subject" value={announcement.subject} onChange={(e) => setAnnouncement({ ...announcement, subject: e.target.value })} required /><textarea className="zemba-input" placeholder="New products, Zambia marketplace news, safety updates..." value={announcement.body} onChange={(e) => setAnnouncement({ ...announcement, body: e.target.value })} required rows={4} /><button className="zemba-btn zemba-btn-primary">Publish update</button></form>{announcementMessage && <p style={{ color: '#FFD37A' }}>{announcementMessage}</p>}</section>
          <section className="zemba-card" style={{ padding: '1.5rem', marginTop: '1.2rem' }}><h3 style={{ color: '#fff' }}>Recent activity</h3><table className="zemba-table"><tbody>{overview.events.map((e: any) => <tr key={e.id}><td>{e.created_at}</td><td>#{e.order_reference}</td><td>{e.event_type}</td></tr>)}</tbody></table></section>
        </main>
      </div>
    </>
  );
}
