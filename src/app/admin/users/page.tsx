'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  async function loadUsers() {
    const response = await fetch('/api/admin/overview');
    setUsers((await response.json()).users || []);
  }
  useEffect(() => { loadUsers(); }, []);

  async function moderate(user: any, account_status: string) {
    const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, account_status, user_category: user.user_category, ban_reason: account_status === 'ACTIVE' ? null : 'Moderated by platform admin' }) });
    setMessage(response.ok ? `${user.full_name} is now ${account_status.toLowerCase()}.` : (await response.json()).error);
    await loadUsers();
  }

  async function categorize(user: any, user_category: string) {
    await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, account_status: user.account_status, user_category }) });
    await loadUsers();
  }

  return (
    <><SkyBackground mode="ambient" /><div className="zemba-page"><nav className="zemba-nav"><a href="/admin/dashboard" className="brand">Zemba Marketplace — Admin</a><div><a href="/admin/dashboard">Overview</a><a href="/admin/disputes">Disputes</a></div></nav>
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '1.5rem auto', padding: '0 1.5rem 4rem' }}><div className="zemba-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ color: '#fff', margin: '0 0 0.3rem' }}>People &amp; moderation</h3><p style={{ color: 'rgba(255,255,255,0.7)' }}>Categorize every account and control who can participate on Zemba.</p>{message && <p style={{ color: '#FFD37A' }}>{message}</p>}
        <div style={{ overflowX: 'auto' }}><table className="zemba-table"><thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Category</th><th>Status</th><th>Newsletter</th><th>Actions</th></tr></thead><tbody>
          {users.map((user) => <tr key={user.id}><td>{user.business_name || user.full_name}</td><td>{user.role}</td><td>{user.email}</td><td><select value={user.user_category} onChange={(e) => categorize(user, e.target.value)}><option>CUSTOMER</option><option>SELLER</option><option>PARTNER</option><option>VIP</option><option>WATCHLIST</option></select></td><td>{user.account_status}</td><td>{user.newsletter_opt_in ? 'Subscribed' : 'Off'}</td><td>{user.role !== 'admin' && <>{user.account_status !== 'ACTIVE' && <button className="zemba-btn zemba-btn-primary" onClick={() => moderate(user, 'ACTIVE')}>Restore</button>}{user.account_status === 'ACTIVE' && <><button className="zemba-btn zemba-btn-secondary" onClick={() => moderate(user, 'SUSPENDED')}>Suspend</button><button className="zemba-btn zemba-btn-secondary" onClick={() => moderate(user, 'BANNED')}>Ban</button></>}</>}</td></tr>)}
        </tbody></table></div>
      </div></main></div></>
  );
}
