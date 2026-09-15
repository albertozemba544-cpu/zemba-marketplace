'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import SkyBackground from '@/components/SkyBackground';

function CheckoutSummaryContent() {
  const params = useSearchParams();
  const refs = (params.get('refs') || '').split(',').filter(Boolean);

  return (
    <>
      <SkyBackground mode="ambient" />
      <div className="zemba-page">
        <nav className="zemba-nav"><a href="/browse" className="brand">Zemba Marketplace</a></nav>
        <main style={{ position: 'relative', zIndex: 1, maxWidth: 520, margin: '3rem auto', padding: '0 1.5rem' }}>
          <div className="zemba-card" style={{ padding: '2rem' }}>
            <h1 style={{ color: '#fff', fontSize: '1.6rem', marginBottom: '0.6rem' }}>Escrow orders created</h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '1.4rem' }}>
              Pay each order below to secure funds in escrow. Sellers are only paid once you confirm delivery.
            </p>
            {refs.map((ref) => (
              <a key={ref} href={`/checkout/${ref}`} className="zemba-btn zemba-btn-secondary" style={{ display: 'block', textAlign: 'center', marginBottom: '0.7rem' }}>
                Order #{ref} — pay now
              </a>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}

export default function CheckoutSummary() {
  return (
    <Suspense fallback={null}>
      <CheckoutSummaryContent />
    </Suspense>
  );
}
