import SiteFooter from './SiteFooter';
import { SITE, whatsappLink } from '@/lib/site';

// Shared frame (header + footer) for the Help, How it works and Contact pages.
export default function InfoPage({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: string; children: React.ReactNode }) {
  const wa = whatsappLink();
  return (
    <div className="zemba-commerce-page">
      <header className="zemba-commerce-header">
        <a href="/" className="zemba-commerce-brand"><span>z</span><strong>Zemba</strong><small>marketplace</small></a>
        <nav className="zemba-info-nav">
          <a href="/browse">Shop</a>
          <a href="/sell">Sell</a>
          <a href="/how-it-works">How it works</a>
          <a href="/help">Help</a>
          <a href="/contact">Contact</a>
          <a href="/login" className="zemba-info-signin">Sign in</a>
        </nav>
      </header>
      <main className="zemba-info">
        {eyebrow && <p className="zemba-retail-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {intro && <p className="zemba-info-intro">{intro}</p>}
        {children}
        <aside className="zemba-info-help">
          <strong>Still need help?</strong>
          <span>
            <a href="/contact">Send us a message</a>
            {wa && <> or <a href={wa} target="_blank" rel="noopener noreferrer">chat with us on WhatsApp</a></>}. We are available {SITE.hours}.
          </span>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
