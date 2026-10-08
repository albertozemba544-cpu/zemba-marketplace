import { SITE, whatsappLink } from '@/lib/site';
import { socialLinks } from '@/lib/social';

// The green footer shown on the homepage and on the information pages.
export default function SiteFooter() {
  const wa = whatsappLink();
  const social = socialLinks();
  return (
    <footer className="zemba-commerce-footer">
      <div className="zemba-footer-main">
        <div>
          <a href="/" className="zemba-commerce-brand"><span>z</span><strong>Zemba</strong><small>marketplace</small></a>
          <p>A safer way to shop local.</p>
          {social.length > 0 && <div className="zemba-social">{social.map((item) => <a key={item.name} href={item.url} target="_blank" rel="noopener noreferrer">{item.name}</a>)}</div>}
        </div>
        <div>
          <strong>Shop</strong>
          <a href="/browse">All products</a>
          <a href="/cart">Your cart</a>
          <a href="/orders">My orders</a>
          <a href="/account">My account</a>
        </div>
        <div>
          <strong>Sell with us</strong>
          <a href="/sell">Sell on Zemba</a>
          <a href="/register?role=seller">Open a store</a>
          <a href="/seller/login">Seller login</a>
          <a href="/how-it-works">How selling works</a>
        </div>
        <div>
          <strong>Help</strong>
          <a href="/how-it-works">How Zemba works</a>
          <a href="/help">Help centre</a>
          <a href="/contact">Contact us</a>
          <a href="/about">About us</a>
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp us</a>}
        </div>
      </div>
      <div className="zemba-footer-bottom">
        <span>© {new Date().getFullYear()} {SITE.name}</span>
        <span><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> · <a href="/refund-policy">Refunds</a> · Protected payments powered by Zemba Tech</span>
      </div>
    </footer>
  );
}
