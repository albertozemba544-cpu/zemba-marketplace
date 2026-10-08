import type { MetadataRoute } from 'next';
import { query } from '@/lib/db';
import { siteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

// A list of your pages and live products for Google (https://yoursite/sitemap.xml).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const pages = ['', '/browse', '/how-it-works', '/about', '/sell', '/help', '/contact', '/terms', '/privacy', '/refund-policy', '/register', '/login'].map((path) => ({ url: `${base}${path}`, lastModified: new Date() }));
  let products: { id: string; created_at: string }[] = [];
  try {
    products = await query("SELECT id, created_at FROM products WHERE status = 'ACTIVE' AND approval_status = 'APPROVED' ORDER BY created_at DESC LIMIT 5000");
  } catch (error) {
    console.error('Sitemap could not read products:', error);
  }
  return [...pages, ...products.map((p) => ({ url: `${base}/product/${p.id}`, lastModified: new Date(p.created_at) }))];
}
