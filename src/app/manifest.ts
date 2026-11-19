import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

// Lets people install Zemba on their phone from the browser ("Add to Home screen"), with no app store.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: 'Zemba',
    description: SITE.description,
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#0b3d2c',
    categories: ['shopping'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
