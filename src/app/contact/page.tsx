import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import ContactForm from '@/components/ContactForm';
import { SITE, whatsappLink } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact us',
  description: 'Get in touch with the Zemba Marketplace team by phone, WhatsApp, email or the contact form.',
};

export default function ContactPage() {
  const wa = whatsappLink();
  const hasDetails = Boolean(SITE.phone || SITE.whatsapp || SITE.email);
  return (
    <InfoPage eyebrow="We are here to help" title="Contact us" intro="Questions about an order, a payment or selling on Zemba? Reach us any of these ways.">
      <div className="zemba-contact-grid">
        <section className="zemba-contact-details">
          {hasDetails ? (
            <>
              {SITE.phone && <div><span>☎</span><div><strong>Call us</strong><a href={`tel:${SITE.phone.replace(/\s/g, '')}`}>{SITE.phone}</a></div></div>}
              {wa && <div><span>💬</span><div><strong>WhatsApp</strong><a href={wa} target="_blank" rel="noopener noreferrer">Chat with us</a></div></div>}
              {SITE.email && <div><span>✉</span><div><strong>Email</strong><a href={`mailto:${SITE.email}`}>{SITE.email}</a></div></div>}
            </>
          ) : (
            <div><span>✉</span><div><strong>Message us</strong><span className="zemba-muted-text">Use the form and we will get back to you.</span></div></div>
          )}
          <div><span>🕘</span><div><strong>Opening hours</strong><span className="zemba-muted-text">{SITE.hours}</span></div></div>
          <div><span>⌖</span><div><strong>Based in</strong><span className="zemba-muted-text">{SITE.location}</span></div></div>
        </section>
        <ContactForm />
      </div>
    </InfoPage>
  );
}
