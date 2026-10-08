import './globals.css';
import type { Metadata, Viewport } from 'next';
import SiteAssistant from '@/components/SiteAssistant';
import { SITE, siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE.name} - shop local, shop protected`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: `${SITE.name} - shop local, shop protected`,
    description: SITE.description,
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  // Google Search Console: paste the code Google gives you into NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : undefined,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b3d2c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}<SiteAssistant /></body>
    </html>
  );
}
