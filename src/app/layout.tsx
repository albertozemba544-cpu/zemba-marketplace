import './globals.css';
import SiteAssistant from '@/components/SiteAssistant';

export const metadata = {
  title: 'Zemba Marketplace',
  description: 'Escrow-backed marketplace for Zambia — buy, sell, and never get scammed.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}<SiteAssistant /></body>
    </html>
  );
}
