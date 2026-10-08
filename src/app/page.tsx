'use client';

import { useEffect, useMemo, useState } from 'react';
import SiteFooter from '@/components/SiteFooter';

interface Product { id: string; title: string; description: string; price: number; category: string; stock: number; image_url?: string | null; seller_verified?: boolean; review_count?: number; avg_rating?: number | null; }
const categoryIcons: Record<string, string> = { Fashion: '✦', Electronics: '⌁', 'Food & Drink': '◌', Home: '⌂' };
const categoryColors: Record<string, string> = { Fashion: 'coral', Electronics: 'blue', 'Food & Drink': 'green', Home: 'gold' };

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('newest');
  const [added, setAdded] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accountName, setAccountName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [menuOpen]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('zemba_user');
    window.location.href = '/';
  }

  function chooseCategory(item: string) {
    setCategory(item);
    setShowSaved(false);
    setMenuOpen(false);
    setTimeout(() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  useEffect(() => {
    fetch('/api/products').then((response) => response.json()).then((data) => setProducts(data.products || [])).finally(() => setLoading(false));
    const stored = localStorage.getItem('zemba_user');
    const saved = localStorage.getItem('zemba_saved_products');
    if (saved) setFavorites(JSON.parse(saved));
    if (stored) {
      const user = JSON.parse(stored);
      setAccountName((user.full_name || '').split(' ')[0] || 'there');
      fetch(`/api/cart?customer_id=${user.id}`).then((response) => response.json()).then((data) => setCartCount((data.items || []).reduce((sum: number, item: any) => sum + item.quantity, 0)));
    }
  }, []);

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map((product) => product.category).filter(Boolean)))], [products]);
  const visibleProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const matchesCategory = category === 'All' || product.category === category;
      const text = `${product.title} ${product.description} ${product.category}`.toLowerCase();
      return matchesCategory && text.includes(query.toLowerCase()) && (!showSaved || favorites.includes(product.id));
    });
    return [...filtered].sort((a, b) => sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : 0);
  }, [products, query, category, sort, showSaved, favorites]);

  function toggleFavorite(productId: string) {
    setFavorites((current) => {
      const next = current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId];
      localStorage.setItem('zemba_saved_products', JSON.stringify(next));
      return next;
    });
  }
  async function addToCart(productId: string) {
    const stored = localStorage.getItem('zemba_user');
    if (!stored) { window.location.href = '/login'; return; }
    const user = JSON.parse(stored);
    const response = await fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_id: user.id, product_id: productId, quantity: 1 }) });
    if (response.ok) { setCartCount((count) => count + 1); setAdded(productId); window.setTimeout(() => setAdded(null), 1400); }
  }

  return (
    <div className="zemba-commerce-page">
      <div className="zemba-topline"><div>Delivering across Zambia <span>•</span> Shop local. Shop protected.</div><div><a href="/help">Help centre</a><a href="/sell">Sell on Zemba</a>{accountName && <a href="#" onClick={(event) => { event.preventDefault(); logout(); }}>Log out</a>}</div></div>
      <header className="zemba-commerce-header"><a href="/" className="zemba-commerce-brand"><span>z</span><strong>Zemba</strong><small>marketplace</small></a><button className="zemba-departments" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}><span>☰</span> Departments</button><div className="zemba-commerce-search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search for products, brands and more" aria-label="Search products" /><select aria-label="Search category" value={category === 'All' ? 'All categories' : category} onChange={(event) => setCategory(event.target.value === 'All categories' ? 'All' : event.target.value)}><option>All categories</option>{categories.filter((item) => item !== 'All').map((item) => <option key={item}>{item}</option>)}</select><button aria-label="Search">⌕</button></div><nav className="zemba-commerce-actions"><a href={accountName ? '/orders' : '/login'} aria-label="Account"><span>♙</span><small>Hello, {accountName || 'sign in'}</small><strong>{accountName ? 'My orders' : 'Account'}</strong></a><button className="zemba-favorite-nav" aria-label="Favorites" onClick={() => { setShowSaved(true); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}><span>♡</span><small>Saved</small><strong>{favorites.length} items</strong></button><a href="/cart" className="zemba-cart-nav" aria-label="Cart"><span>🛒<b>{cartCount}</b></span><strong>Cart</strong></a></nav></header>
      {menuOpen && (
        <div className="zemba-drawer-wrap" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="zemba-drawer-backdrop" onClick={() => setMenuOpen(false)} />
          <aside className="zemba-drawer">
            <div className="zemba-drawer-top">
              <a href="/" className="zemba-commerce-brand"><span>z</span><strong>Zemba</strong><small>marketplace</small></a>
              <button className="zemba-drawer-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">✕</button>
            </div>
            <p className="zemba-drawer-hello">{accountName ? `Hello, ${accountName}` : 'Welcome to Zemba'}</p>
            <h4>Shop by category</h4>
            <button onClick={() => chooseCategory('All')}>All products</button>
            {categories.filter((item) => item !== 'All').map((item) => <button key={item} onClick={() => chooseCategory(item)}>{item}</button>)}
            <h4>Your account</h4>
            {accountName ? (
              <>
                <a href="/orders">My orders</a>
                <a href="/cart">My cart</a>
                <a href="/account">My account</a>
                <button onClick={logout}>Log out</button>
              </>
            ) : (
              <>
                <a href="/login">Log in</a>
                <a href="/register">Create an account</a>
                <a href="/seller/login">Seller login</a>
              </>
            )}
            <h4>Sell and learn</h4>
            <a href="/sell">Sell on Zemba</a>
            <a href="/how-it-works">How Zemba works</a>
            <a href="/help">Help centre</a>
            <a href="/contact">Contact us</a>
            <a href="/about">About us</a>
          </aside>
        </div>
      )}
      <nav className="zemba-department-bar"><div><button onClick={() => { setCategory('All'); setShowSaved(false); }}>All products</button>{categories.filter((item) => item !== 'All').map((item) => <button key={item} onClick={() => { setCategory(item); setShowSaved(false); }}>{item}</button>)}<a href="/browse">Today's deals</a><button onClick={() => { setShowSaved(false); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}>New arrivals</button></div></nav>

      <main>
        <section className="zemba-retail-hero"><div className="zemba-hero-copy"><p className="zemba-retail-eyebrow">Zambia's marketplace</p><h1>Great finds.<br /><em>Right nearby.</em></h1><p>Discover everyday essentials, local design and trusted sellers in one protected place.</p><div><button className="zemba-retail-cta" onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}>Shop now <span>→</span></button><a href="/sell" className="zemba-hero-link">Start selling</a></div></div><div className="zemba-hero-art"><img className="zemba-photo-fill" src="/images/hero.jpg" alt="" onLoad={(event) => event.currentTarget.parentElement?.classList.add('has-photo')} onError={(event) => { event.currentTarget.style.display = 'none'; }} /><div className="zemba-art-label">LOCAL<br /><strong>FINDS</strong></div><div className="zemba-art-shape shape-one">✦</div><div className="zemba-art-shape shape-two">◌</div><div className="zemba-art-shape shape-three">⌁</div><span>Made here.<br />Found by you.</span></div></section>
        <section className="zemba-trust-row"><div><span>✓</span><div><strong>Protected payments</strong><small>Escrow on every order</small></div></div><div><span>⌖</span><div><strong>Local sellers</strong><small>Buy from Zambia</small></div></div><div><span>↺</span><div><strong>Shop with confidence</strong><small>Support when you need it</small></div></div><div><span>✦</span><div><strong>Fresh listings</strong><small>New finds every week</small></div></div></section>
        <section className="zemba-shop-section" id="departments"><div className="zemba-section-top"><div><p className="zemba-retail-eyebrow">Curated for you</p><h2>Shop popular picks</h2></div><a href="/browse">See all products <span>→</span></a></div><div className="zemba-category-tiles">{categories.filter((item) => item !== 'All').map((item) => <button key={item} className={`zemba-category-tile ${categoryColors[item] || 'gold'}`} onClick={() => { setCategory(item); setShowSaved(false); }}><span>{categoryIcons[item] || '✦'}</span><strong>{item}</strong><small>Shop now →</small></button>)}</div></section>
        <section className="zemba-shop-section zemba-product-section" id="products"><div className="zemba-section-top"><div><p className="zemba-retail-eyebrow">{showSaved ? 'Your shortlist' : 'Handpicked today'}</p><h2>{showSaved ? 'Saved items' : category === 'All' ? 'Fresh from local sellers' : category}</h2></div><div className="zemba-product-controls"><span>{visibleProducts.length} products</span><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products"><option value="newest">Newest first</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></div></div>{loading && <p className="zemba-market-message">Loading today's finds...</p>}{!loading && visibleProducts.length === 0 && <p className="zemba-market-message">{showSaved ? 'You have not saved any products yet.' : 'No products match your search yet.'}</p>}<div className="zemba-retail-grid">{visibleProducts.map((product) => <article key={product.id} className="zemba-retail-card"><div className={`zemba-retail-image ${categoryColors[product.category] || 'gold'}`}><a href={`/product/${product.id}`}>{product.image_url ? <img src={product.image_url} alt="" /> : <span>{categoryIcons[product.category] || '✦'}</span>}</a><button className={favorites.includes(product.id) ? 'saved' : ''} onClick={() => toggleFavorite(product.id)} aria-label={`Save ${product.title}`}>{favorites.includes(product.id) ? '♥' : '♡'}</button><small>{product.stock > 0 ? 'In stock' : 'Sold out'}</small></div><div className="zemba-retail-card-body"><p>{product.category}</p><h3><a href={`/product/${product.id}`}>{product.title}</a></h3>{product.seller_verified && <div className="zemba-card-verified">✓ Verified seller</div>}{(product.review_count ?? 0) > 0 ? <div className="zemba-rating">{'★'.repeat(Math.round(Number(product.avg_rating) || 0))}{'☆'.repeat(5 - Math.round(Number(product.avg_rating) || 0))} <span>({product.review_count})</span></div> : <div className="zemba-rating"><span>No reviews yet</span></div>}<div className="zemba-retail-price"><strong>K{Number(product.price).toFixed(2)}</strong><button onClick={() => addToCart(product.id)} disabled={product.stock < 1}>{added === product.id ? 'Added ✓' : product.stock > 0 ? '+ Cart' : 'Sold out'}</button></div></div></article>)}</div></section>
        <section className="zemba-shop-section zemba-how">
          <div className="zemba-section-top"><div><p className="zemba-retail-eyebrow">Simple and safe</p><h2>How buying on Zemba works</h2></div><a href="/how-it-works">Learn more <span>→</span></a></div>
          <div className="zemba-how-grid">
            <div><span>1</span><h3>Pay into escrow</h3><p>Your money is held safely. The seller does not get it yet.</p></div>
            <div><span>2</span><h3>The seller ships</h3><p>By bus or courier. You see the waybill number and where to collect it.</p></div>
            <div><span>3</span><h3>Confirm with your code</h3><p>Enter your delivery code when the item arrives. Only then is the seller paid.</p></div>
          </div>
        </section>
        <section className="zemba-seller-callout"><div><p className="zemba-retail-eyebrow">For local entrepreneurs</p><h2>Your products belong<br />in the spotlight.</h2><p>Open your Zemba storefront and reach customers across Zambia with protected payments built in.</p><a href="/sell" className="zemba-retail-cta">Start selling <span>→</span></a></div><div className="zemba-seller-art"><img className="zemba-photo-fill" src="/images/sell.jpg" alt="" onLoad={(event) => event.currentTarget.parentElement?.classList.add('has-photo')} onError={(event) => { event.currentTarget.style.display = 'none'; }} /><span>SELL<br /><strong>LOCAL</strong></span><i>✦</i></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
