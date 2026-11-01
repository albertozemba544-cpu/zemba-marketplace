// The top bar used on the admin pages.
export default function AdminNav() {
  return (
    <nav className="zemba-nav">
      <a href="/admin/dashboard" className="brand">Zemba Marketplace — Admin</a>
      <div className="zemba-admin-links">
        <a href="/admin/dashboard">Overview</a>
        <a href="/admin/flags">Flags &amp; reports</a>
        <a href="/admin/disputes">Disputes</a>
        <a href="/admin/orders">Stuck orders</a>
        <a href="/admin/payouts">Payouts</a>
        <a href="/admin/email">Email users</a>
        <a href="/admin/controls">Controls</a>
        <a href="/admin/users">Users</a>
      </div>
    </nav>
  );
}
