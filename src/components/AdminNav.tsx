// The top bar used on every admin page, so the menu is the same everywhere.
export default function AdminNav() {
  return (
    <nav className="zemba-nav">
      <a href="/admin/dashboard" className="brand">Zemba Marketplace — Admin</a>
      <div className="zemba-admin-links">
        <a href="/admin/dashboard">Today</a>
        <a href="/admin/disputes">Disputes</a>
        <a href="/admin/orders">Stuck orders</a>
        <a href="/admin/payouts">Payouts</a>
        <a href="/admin/flags">Flags &amp; reports</a>
        <a href="/admin/messages">Messages</a>
        <a href="/admin/email">Email users</a>
        <a href="/admin/verifications">Verify sellers</a>
        <a href="/admin/users">Users</a>
        <a href="/admin/controls">Controls</a>
      </div>
    </nav>
  );
}
