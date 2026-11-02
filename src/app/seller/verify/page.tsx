'use client';

import { useEffect, useState } from 'react';
import SkyBackground from '@/components/SkyBackground';

export default function SellerVerify() {
  const [info, setInfo] = useState<{ status: string; reason: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/seller/verification').then((r) => {
      if (r.status === 401 || r.status === 403) { window.location.href = '/seller/login'; return null; }
      return r.json();
    }).then((d) => { if (d) setInfo(d); });
  }, []);

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <nav className="zemba-nav"><a href="/seller/dashboard" className="brand">Zemba Marketplace — Seller</a><div><a href="/seller/dashboard">Dashboard</a></div></nav>
        <main style={{ maxWidth: 640, margin: '1.5rem auto', padding: '0 1.5rem 4rem' }}>
          <h1 style={{ fontSize: '1.7rem', margin: 0 }}>Get the Verified seller badge</h1>
          <p className="zemba-muted">Buyers trust sellers whose identity has been checked, and verified shops are easier to sell for.</p>
          {!info && <p className="zemba-muted">Loading…</p>}

          {info?.status === 'VERIFIED' && (
            <div className="zemba-card" style={{ padding: '1.4rem' }}>
              <span className="zemba-verified" style={{ marginLeft: 0 }}>✓ Verified seller</span>
              <p>Your ID has been checked. The badge shows on your listings and your shop page.</p>
            </div>
          )}

          {info && info.status !== 'VERIFIED' && (
            <div className="zemba-card" style={{ padding: '1.4rem' }}>
              <strong>Verify with a short video call</strong>
              <p>A member of the Zemba team checks your NRC and your face on a short WhatsApp video call, then adds the badge to your shop. We do not collect or keep photos or recordings of your ID.</p>
              <ul className="zemba-muted" style={{ paddingLeft: '1.2rem', lineHeight: 1.6 }}>
                <li>Have your original NRC with you.</li>
                <li>The name and NRC number must match what you gave when you registered.</li>
              </ul>
              {info.status === 'REJECTED' && info.reason && <div className="zemba-form-error">Note: {info.reason}</div>}
              <p><a className="zemba-btn zemba-btn-primary" href="/contact" style={{ textDecoration: 'none' }}>Contact us to book a call</a></p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
