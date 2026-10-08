import type { Metadata } from 'next';
import { queryOne } from '@/lib/db';
import { isUuid } from '@/lib/http';

// Gives every product its own page title and share preview (WhatsApp, Facebook, Google).
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  if (!isUuid(params.id)) return { title: 'Product' };
  try {
    const product = await queryOne<{ title: string; description: string | null; image_url: string | null }>(
      "SELECT title, description, image_url FROM products WHERE id = $1 AND approval_status = 'APPROVED' AND status IN ('ACTIVE', 'LINK_ONLY')",
      [params.id]
    );
    if (!product) return { title: 'Product not found' };
    const description = (product.description || `Buy ${product.title} on Zemba Marketplace with protected escrow payments.`).slice(0, 160);
    return {
      title: product.title,
      description,
      openGraph: { title: product.title, description, images: product.image_url ? [{ url: product.image_url }] : undefined },
    };
  } catch {
    return { title: 'Product' };
  }
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
