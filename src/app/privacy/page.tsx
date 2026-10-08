import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Privacy Policy', description: `How ${SITE.name} collects, uses and protects your personal information.` };

export default function PrivacyPage() {
  return (
    <InfoPage eyebrow="Legal" title="Privacy Policy" intro="What information we collect, why we collect it, who sees it, and the choices you have.">
      <div className="zemba-legal">
        <p className="zemba-legal-meta">Last updated {SITE.legalUpdated}</p>
        <div className="zemba-legal-note">
          <strong>In short</strong>
          We collect only what we need to run your account and your orders. We never sell your personal information. You can ask us to see, correct or delete it.
        </div>

        <h2>1. Who we are</h2>
        <p>{SITE.name} is run by {SITE.legalName}{SITE.registrationNumber ? `, registration number ${SITE.registrationNumber}` : ''}{SITE.address ? `, ${SITE.address}` : ''}. We are responsible for the personal information described in this policy (the &quot;data controller&quot; under Zambia&apos;s Data Protection Act, 2021).{SITE.email ? <> You can reach us about privacy at <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</> : <> You can reach us about privacy through our <a href="/contact">contact page</a>.</>}</p>

        <h2>2. What we collect</h2>
        <ul>
          <li><strong>Your account:</strong> full name, phone number, email address, and your password (kept only in scrambled form that we cannot read), and whether you want news and offers.</li>
          <li><strong>If you sell:</strong> business name, NRC number, location, and the mobile money provider and number for payouts.</li>
          <li><strong>If you apply for the Verified badge:</strong> a photo of your NRC and a selfie. They are kept in private storage that only authorised Zemba staff can open, and they are deleted as soon as we have decided. We keep only the result (verified or not) and the date.</li>
          <li><strong>Delivery details:</strong> the name, phone number, town and pickup note you give at checkout. The seller sees them and passes them on to the bus company or courier that carries your item.</li>
          <li><strong>Your choices:</strong> whether you want news and offers, and whether you want order updates on WhatsApp.</li>
          <li><strong>Your orders:</strong> what you bought or sold, amounts, order status, delivery code, proof-of-dispatch photos, dispute messages and notifications.</li>
          <li><strong>Your messages and reviews:</strong> anything you send through our contact form or suggestion box, and reviews you write.</li>
          <li><strong>When you accepted our terms:</strong> the date and time you created your account and agreed to our policies.</li>
          <li><strong>Technical information:</strong> our hosting provider records basic technical data, such as IP address and browser type, to deliver and protect the website.</li>
        </ul>

        <h2>3. Why we use it</h2>
        <ul>
          <li>To create and run your account and to confirm your email address.</li>
          <li>To process orders, hold payments in escrow, deliver payouts and refunds, and settle disputes.</li>
          <li>To check sellers and prevent fraud, abuse and unsafe listings.</li>
          <li>To send you service messages, for example order updates and password reset links, by email and, where switched on, SMS.</li>
          <li>To answer your questions and improve the website.</li>
          <li>To send news and offers, only if you chose to receive them. You can opt out at any time.</li>
          <li>To meet our legal duties, such as keeping records or answering lawful requests from authorities.</li>
        </ul>

        <h2>4. Who we share it with</h2>
        <p>We never sell your personal information. We share it only as needed with:</p>
        <ul>
          <li><strong>The other person in your order.</strong> For example, sellers see the details needed to complete a sale, and buyers see the seller&apos;s business name.</li>
          <li><strong>Bus companies and couriers,</strong> through the seller, so that your item can be carried to you and you can be called when it arrives.</li>
          <li><strong>A messaging service for WhatsApp,</strong> only if you ticked the WhatsApp box. We pass it your phone number and the text of the order update so that it can send the message.</li>
          <li><strong>Payment providers</strong> such as MTN and Airtel mobile money and any payment gateway we use, to take payments, send payouts and refunds.</li>
          <li><strong>Service providers that help us run the website:</strong> Supabase (database and photo storage), Vercel (website hosting), Brevo (email) and, if switched on, Africa&apos;s Talking (SMS). They may only use the information to provide their service to us.</li>
          <li><strong>Authorities</strong> when the law requires it, or to protect people from fraud or harm.</li>
        </ul>
        <p>Some of these providers keep information on servers outside Zambia. We choose providers with security safeguards and share only what is needed.</p>

        <h2>5. Cookies and browser storage</h2>
        <p>We use one essential cookie that keeps you logged in. We also save your name and your saved products in your own browser so the website can show them. We do not use advertising cookies. If we add analytics tools in future, we will update this page.</p>

        <h2>6. How long we keep it</h2>
        <p>We keep your information while your account is open and for as long as needed afterwards for orders, disputes, fraud prevention, and the records the law requires, for example for tax and accounting. After that we delete it or make it anonymous.</p>

        <h2>7. How we protect it</h2>
        <p>The website uses an encrypted (HTTPS) connection, passwords are stored in scrambled form, and access to the database is limited. No system is perfectly secure. If a security breach affects your personal information, we will act quickly and notify the Data Protection Commissioner and affected people as the law requires.</p>

        <h2>8. Your rights</h2>
        <p>You can ask us to show you the information we hold about you, correct it, delete it, or stop using it for marketing, and you can withdraw consent you gave earlier. Contact us and we will respond within a reasonable time. Some information must be kept for legal or fraud-prevention reasons, and we will tell you if that applies. If you are not happy with how we handle your information, you may complain to the Office of the Data Protection Commissioner in Zambia.</p>

        <h2>9. Children</h2>
        <p>Zemba is for people aged 18 and over. We do not knowingly collect information from children. If you think a child has given us information, please contact us and we will delete it.</p>

        <h2>10. Changes to this policy</h2>
        <p>We may update this policy. The date at the top shows when it last changed. For big changes we will tell you on the website or by email.</p>

        <h2>11. Contact us</h2>
        <p>Questions about your information? Use our <a href="/contact">contact page</a>{SITE.email ? <> or email <a href={`mailto:${SITE.email}`}>{SITE.email}</a></> : null}.</p>
      </div>
    </InfoPage>
  );
}
