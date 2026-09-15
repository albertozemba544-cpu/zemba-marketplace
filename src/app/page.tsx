'use client';

import { useEffect, useMemo, useState } from 'react';

interface Product { id: string; title: string; description: string; price: number; category: string; stock: number; image_url?: string | null; }
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

  useEffect(() => {
    fetch('/api/products').then((response) => response.json()).then((data) => setProducts(data.products || [])).finally(() => setLoading(false));
    const stored = localStorage.getItem('zemba_user');
    const saved = localStorage.getItem('zemba_saved_products');
    if (saved) setFavorites(JSON.parse(saved));
    if (stored) {
      const user = JSON.parse(stored);
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
      <div className="zemba-topline"><div>Delivering across Zambia <span>•</span> Shop local. Shop protected.</div><div><a href="/browse">Help centre</a><a href="/seller/login">Sell on Zemba</a></div></div>
      <header className="zemba-commerce-header"><a href="/" className="zemba-commerce-brand"><span>z</span><strong>Zemba</strong><small>marketplace</small></a><button className="zemba-departments" onClick={() => document.getElementById('departments')?.scrollIntoView({ behavior: 'smooth' })}><span>☰</span> Departments</button><div className="zemba-commerce-search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search for products, brands and more" aria-label="Search products" /><select aria-label="Search category" value={category === 'All' ? 'All categories' : category} onChange={(event) => setCategory(event.target.value === 'All categories' ? 'All' : event.target.value)}><option>All categories</option>{categories.filter((item) => item !== 'All').map((item) => <option key={item}>{item}</option>)}</select><button aria-label="Search">⌕</button></div><nav className="zemba-commerce-actions"><a href="/login" aria-label="Account"><span>♙</span><small>Hello, sign in</small><strong>Account</strong></a><button className="zemba-favorite-nav" aria-label="Favorites" onClick={() => { setShowSaved(true); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}><span>♡</span><small>Saved</small><strong>{favorites.length} items</strong></button><a href="/cart" className="zemba-cart-nav" aria-label="Cart"><span>🛒<b>{cartCount}</b></span><strong>Cart</strong></a></nav></header>
      <nav className="zemba-department-bar"><div><button onClick={() => { setCategory('All'); setShowSaved(false); }}>All products</button>{categories.filter((item) => item !== 'All').map((item) => <button key={item} onClick={() => { setCategory(item); setShowSaved(false); }}>{item}</button>)}<a href="/browse">Today's deals</a><button onClick={() => { setShowSaved(false); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }}>New arrivals</button></div></nav>

      <main>
        <section className="zemba-retail-hero"><div className="zemba-hero-copy"><p className="zemba-retail-eyebrow">Zambia's marketplace</p><h1>Great finds.<br /><em>Right nearby.</em></h1><p>Discover everyday essentials, local design and trusted sellers in one protected place.</p><div><button className="zemba-retail-cta" onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}>Shop now <span>→</span></button><a href="/seller/login" className="zemba-hero-link">Start selling</a></div></div><div className="zemba-hero-art"><div className="zemba-art-label">LOCAL<br /><strong>FINDS</strong></div><div className="zemba-art-shape shape-one">✦</div><div className="zemba-art-shape shape-two">◌</div><div className="zemba-art-shape shape-three">⌁</div><span>Made here.<br />Found by you.</span></div></section>
        <section className="zemba-trust-row"><div><span>✓</span><div><strong>Protected payments</strong><small>Escrow on every order</small></div></div><div><span>⌖</span><div><strong>Local sellers</strong><small>Buy from Zambia</small></div></div><div><span>↺</span><div><strong>Shop with confidence</strong><small>Support when you need it</small></div></div><div><span>✦</span><div><strong>Fresh listings</strong><small>New finds every week</small></div></div></section>
        <section className="zemba-shop-section" id="departments"><div className="zemba-section-top"><div><p className="zemba-retail-eyebrow">Curated for you</p><h2>Shop popular picks</h2></div><a href="/browse">See all products <span>→</span></a></div><div className="zemba-category-tiles">{categories.filter((item) => item !== 'All').map((item) => <button key={item} className={`zemba-category-tile ${categoryColors[item] || 'gold'}`} onClick={() => { setCategory(item); setShowSaved(false); }}><span>{categoryIcons[item] || '✦'}</span><strong>{item}</strong><small>Shop now →</small></button>)}</div></section>
        <section className="zemba-shop-section zemba-product-section" id="products"><div className="zemba-section-top"><div><p className="zemba-retail-eyebrow">{showSaved ? 'Your shortlist' : 'Handpicked today'}</p><h2>{showSaved ? 'Saved items' : category === 'All' ? 'Fresh from local sellers' : category}</h2></div><div className="zemba-product-controls"><span>{visibleProducts.length} products</span><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products"><option value="newest">Newest first</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></div></div>{loading && <p className="zemba-market-message">Loading today's finds...</p>}{!loading && visibleProducts.length === 0 && <p className="zemba-market-message">{showSaved ? 'You have not saved any products yet.' : 'No products match your search yet.'}</p>}<div className="zemba-retail-grid">{visibleProducts.map((product) => <article key={product.id} className="zemba-retail-card"><div className={`zemba-retail-image ${categoryColors[product.category] || 'gold'}`}><a href={`/product/${product.id}`}>{product.image_url ? <img src={product.image_url} alt="" /> : <span>{categoryIcons[product.category] || '✦'}</span>}</a><button className={favorites.includes(product.id) ? 'saved' : ''} onClick={() => toggleFavorite(product.id)} aria-label={`Save ${product.title}`}>{favorites.includes(product.id) ? '♥' : '♡'}</button><small>{product.stock > 0 ? 'In stock' : 'Sold out'}</small></div><div className="zemba-retail-card-body"><p>{product.category}</p><h3><a href={`/product/${product.id}`}>{product.title}</a></h3><div className="zemba-rating">★★★★★ <span>New listing</span></div><div className="zemba-retail-price"><strong>K{Number(product.price).toFixed(2)}</strong><button onClick={() => addToCart(product.id)} disabled={product.stock < 1}>{added === product.id ? 'Added ✓' : product.stock > 0 ? '+ Cart' : 'Sold out'}</button></div></div></article>)}</div></section>
        <section className="zemba-seller-callout"><div><p className="zemba-retail-eyebrow">For local entrepreneurs</p><h2>Your products belong<br />in the spotlight.</h2><p>Open your Zemba storefront and reach customers across Zambia with protected payments built in.</p><a href="/register" className="zemba-retail-cta">Start selling <span>→</span></a></div><div className="zemba-seller-art"><span>SELL<br /><strong>LOCAL</strong></span><i>✦</i></div></section>
      </main>
      <footer className="zemba-commerce-footer"><div className="zemba-footer-main"><div><a href="/" className="zemba-commerce-brand"><span>z</span><strong>Zemba</strong><small>marketplace</small></a><p>A safer way to shop local.</p></div><div><strong>Shop</strong><a href="/browse">All products</a><a href="/browse">Today's deals</a><a href="/cart">Your cart</a></div><div><strong>Sell with us</strong><a href="/seller/login">Open a store</a><a href="/register">Create an account</a><a href="/browse">Seller support</a></div><div><strong>Help</strong><a href="/browse">How Zemba works</a><a href="/login">Account help</a><a href="/browse">Contact us</a></div></div><div className="zemba-footer-bottom"><span>© 2026 Zemba Marketplace</span><span>Protected payments powered by Zemba Tech</span></div></footer>
    </div>
  );
}
