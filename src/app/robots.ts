import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

// Tells Google what to list. Private pages (accounts, carts, admin) are kept out of search results.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin/', '/seller/', '/cart', '/checkout', '/orders', '/quick-pay', '/reset-password', '/verify-email', '/forgot-password'] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
