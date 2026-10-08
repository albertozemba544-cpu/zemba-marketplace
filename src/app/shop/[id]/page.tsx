'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SellerTrust from '@/components/SellerTrust';

export default function SellerShop() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/shop?id=${id}`).then(async (r) => {
      if (!r.ok) { setMissing(true); return; }
      setData(await r.json());
    });
  }, [id]);

  if (missing) return <main className="zemba-product-loading">This shop could not be found. <a href="/browse">Back to shopping</a></main>;
  if (!data) return <main className="zemba-product-loading">Loading shop…</main>;
  const { seller, products, reviews } = data;

  return (
    <div className="zemba-detail-page">
      <nav className="zemba-commerce-header zemba-detail-nav">
        <a href="/" className="zemba-commerce-brand"><span>z</span><strong>Zemba</strong><small>marketplace</small></a>
        <div className="zemba-detail-nav-links"><a href="/browse">Continue shopping</a><a href="/cart">Cart</a></div>
      </nav>
      <main className="zemba-detail-main">
        <a href="/browse" className="zemba-breadcrumb">Home / Shops / {seller.name}</a>
        <section className="zemba-shop-head">
          <h1>{seller.name}{seller.verified && <span className="zemba-verified" title="Zemba checked this seller's NRC and a selfie">✓ Verified seller</span>}</h1>
          {reviews && reviews.count > 0 && <p className="zemba-muted">Seller rating {Number(reviews.average).toFixed(1)} / 5 from {reviews.count} review{reviews.count === 1 ? '' : 's'} by real buyers</p>}
          <SellerTrust trust={seller} />
        </section>
        <h2 className="zemba-info-h2">Products</h2>
        {products.length === 0 && <p className="zemba-muted">This seller has no products listed right now.</p>}
        <div className="zemba-retail-grid">
          {products.map((p: any) => (
            <article key={p.id} className="zemba-retail-card">
              <div className="zemba-retail-image gold"><a href={`/product/${p.id}`}>{p.image_url ? <img src={p.image_url} alt={p.title} /> : <span>✦</span>}</a></div>
              <div className="zemba-retail-card-body">
                <p>{p.category}</p>
                <h3><a href={`/product/${p.id}`}>{p.title}</a></h3>
                <div className="zemba-retail-price"><strong>K{Number(p.price).toFixed(2)}</strong></div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
