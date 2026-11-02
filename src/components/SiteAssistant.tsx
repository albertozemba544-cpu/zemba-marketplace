import { whatsappLink } from '@/lib/site';

// A floating help button. It opens WhatsApp if you have set a WhatsApp number in site.ts, otherwise the Contact page.
export default function SiteAssistant() {
  const wa = whatsappLink('Hello Zemba Marketplace, I need help with...');
  return (
    <a
      className="zemba-assistant-launcher"
      href={wa || '/contact'}
      target={wa ? '_blank' : undefined}
      rel={wa ? 'noopener noreferrer' : undefined}
      aria-label={wa ? 'Chat with us on WhatsApp' : 'Contact us'}
    >
      💬 <span>{wa ? 'Chat with us' : 'Help'}</span>
    </a>
  );
}
