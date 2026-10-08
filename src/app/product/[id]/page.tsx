'use client';

import SellerTrust from '@/components/SellerTrust';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Product { id: string; title: string; description: string; price: number; category: string; stock: number; image_url?: string | null; seller_name: string; seller_id?: string; seller_trust?: any; images?: { id: string; url: string }[]; }
interface Review { id: string; full_name: string; product_rating: number; seller_rating: number; comment: string; created_at: string; verified_purchase?: boolean; }

function Gallery({ images, title }: { images: { id: string; url: string }[]; title: string }) {
  const [index, setIndex] = useState(0);
  if (images.length === 0) return <div className="zemba-detail-image"><span>✦</span></div>;
  const current = images[Math.min(index, images.length - 1)];
  return (
    <div className="zemba-gallery">
      <div className="zemba-detail-image"><img src={current.url} alt={title} /></div>
      {images.length > 1 && (
        <div className="zemba-thumbs">
          {images.map((image, i) => <button key={image.id} type="button" className={i === index ? 'active' : ''} onClick={() => setIndex(i)} aria-label={`Show photo ${i + 1}`}><img src={image.url} alt="" /></button>)}
        </div>
      )}
    </div>
  );
}

function reviewNote(eligibility: string): string {
  if (eligibility === 'not_logged_in') return 'Log in with your buyer account. Only people who bought and received this item can review it.';
  if (eligibility === 'not_buyer') return 'Only buyer accounts can write reviews.';
  if (eligibility === 'already_reviewed') return 'You have already reviewed this product. Thank you!';
  return 'Only people who bought and received this item can review it. That keeps every review real.';
}

function Stars({ value }: { value: number }) { return <span className="zemba-stars" aria-label={`${value} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <span key={star} className={star <= value ? 'filled' : ''}>★</span>)}</span>; }

export default function ProductDetail() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState({ count: 0, product_rating: 0, seller_rating: 0 });
  const [rating, setRating] = useState(0);
  const [sellerRating, setSellerRating] = useState(0);
  const [comment, setComment] = useState('');
  const [eligibility, setEligibility] = useState('not_logged_in');
  const [pageUrl, setPageUrl] = useState('');
  useEffect(() => { setPageUrl(window.location.href); }, []);
  const [notice, setNotice] = useState('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews?product_id=${params.id}`).then((response) => response.json()).then((data) => { setReviews(data.reviews || []); setEligibility(data.eligibility || 'not_logged_in'); setSummary(data.summary || { count: 0, product_rating: 0, seller_rating: 0 }); });
    fetch(`/api/product-detail?id=${params.id}`).then((response) => response.ok && response.json()).then((data) => data && setProduct(data.product));
  }, [params.id]);

  async function addToCart() {
    const stored = localStorage.getItem('zemba_user');
    if (!stored) { window.location.href = '/login'; return; }
    const response = await fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_id: JSON.parse(stored).id, product_id: params.id, quantity: 1 }) });
    setAdded(response.ok);
  }

  async function submitReview(event: FormEvent) {
    event.preventDefault();
    const stored = localStorage.getItem('zemba_user');
    if (!stored) { window.location.href = '/login'; return; }
    const response = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: params.id, user_id: JSON.parse(stored).id, product_rating: rating, seller_rating: sellerRating, comment }) });
    const data = await response.json();
    setNotice(response.ok ? 'Your review is live. Thank you for helping other shoppers.' : data.error);
    if (response.ok) { setRating(0); setSellerRating(0); setComment(''); const refreshed = await fetch(`/api/reviews?product_id=${params.id}`).then((result) => result.json()); setReviews(refreshed.reviews); setEligibility(refreshed.eligibility || 'already_reviewed'); setSummary(refreshed.summary); }
  }

  if (!product) return <main className="zemba-product-loading">Loading product...</main>;
  return <div className="zemba-detail-page"><nav className="zemba-commerce-header zemba-detail-nav"><a href="/" className="zemba-commerce-brand"><span>z</span><strong>Zemba</strong><small>marketplace</small></a><div className="zemba-detail-nav-links"><a href="/browse">Continue shopping</a><a href="/cart">Cart</a></div></nav><main className="zemba-detail-main"><a href="/browse" className="zemba-breadcrumb">Home / {product.category} / {product.title}</a><section className="zemba-product-overview"><Gallery images={product.images && product.images.length ? product.images : product.image_url ? [{ id: 'main', url: product.image_url }] : []} title={product.title} /><div className="zemba-detail-copy"><p className="zemba-retail-eyebrow">{product.category}</p><h1>{product.title}</h1><div className="zemba-review-summary"><Stars value={Math.round(summary.product_rating)} /><a href="#reviews">{summary.count} customer {summary.count === 1 ? 'review' : 'reviews'}</a></div><p className="zemba-detail-seller">Sold by <a href={`/shop/${product.seller_id}`}><strong>{product.seller_name}</strong></a>{product.seller_trust?.verified && <span className="zemba-verified" title="Zemba checked this seller's NRC and a selfie">✓ Verified seller</span>} <span>·</span> Seller rating <Stars value={Math.round(summary.seller_rating)} /></p>{product.seller_trust && <SellerTrust trust={product.seller_trust} />}<p className="zemba-detail-description">{product.description}</p><strong className="zemba-detail-price">K{Number(product.price).toFixed(2)}</strong><p className="zemba-detail-stock">{product.stock > 0 ? `In stock (${product.stock} available)` : 'Currently sold out'}</p><button className="zemba-detail-cart" onClick={addToCart} disabled={product.stock < 1}>{added ? 'Added to cart ✓' : 'Add to cart'}</button><a href="/cart" className="zemba-detail-buy">Go to cart and checkout →</a>{pageUrl && <a className="zemba-share" href={`https://wa.me/?text=${encodeURIComponent(`${product.title} - K${Number(product.price).toFixed(2)} on Zemba Marketplace: ${pageUrl}`)}`} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>}<div className="zemba-detail-protection"><span>✓</span><div><strong>Protected purchase</strong><small>Your payment is held safely in escrow until delivery.</small></div></div></div></section><section className="zemba-review-area" id="reviews"><div className="zemba-review-heading"><div><p className="zemba-retail-eyebrow">Community feedback</p><h2>Reviews &amp; comments</h2></div><div className="zemba-review-score"><strong>{summary.product_rating ? summary.product_rating.toFixed(1) : 'New'}</strong>{summary.count > 0 && <Stars value={Math.round(summary.product_rating)} />}<small>{summary.count} reviews</small></div></div><div className="zemba-review-columns"><div className="zemba-review-list">{reviews.length === 0 && <p className="zemba-empty-reviews">No reviews yet. Be the first customer to share your experience.</p>}{reviews.map((review) => <article key={review.id} className="zemba-review"><div className="zemba-review-avatar">{review.full_name.charAt(0)}</div><div><strong>{review.full_name}</strong>{review.verified_purchase && <span className="zemba-verified-purchase">✓ Verified purchase</span>}<small>{new Date(review.created_at).toLocaleDateString()}</small><div><Stars value={review.product_rating} /> <span className="zemba-review-seller">Seller: {review.seller_rating}/5</span></div><p>{review.comment}</p></div></article>)}</div>{eligibility === 'ok' ? <form className="zemba-review-form" onSubmit={submitReview}><h3>Share your experience</h3><p>Review the product and the seller to help the Zemba community.</p><label>Product rating <span className="zemba-rating-input">{[1, 2, 3, 4, 5].map((star) => <button type="button" key={star} className={star <= rating ? 'active' : ''} onClick={() => setRating(star)} aria-label={`${star} stars`}>★</button>)}</span></label><label>Seller rating <span className="zemba-rating-input">{[1, 2, 3, 4, 5].map((star) => <button type="button" key={star} className={star <= sellerRating ? 'active' : ''} onClick={() => setSellerRating(star)} aria-label={`${star} seller stars`}>★</button>)}</span></label><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What did you like, and what should other shoppers know?" required rows={5} /><button className="zemba-retail-cta" disabled={!rating || !sellerRating}>Post review <span>→</span></button>{notice && <div className="zemba-form-notice">{notice}</div>}</form> : <div className="zemba-review-form"><h3>Reviews come from real buyers</h3><p>{reviewNote(eligibility)}</p></div>}</div></section></main></div>;
}
