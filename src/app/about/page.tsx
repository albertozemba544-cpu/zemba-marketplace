import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'About us', description: `Why ${SITE.name} exists and how it keeps buying and selling safe.` };

export default function AboutPage() {
  return (
    <InfoPage eyebrow="About us" title="A safer way to shop local" intro={`${SITE.name} is a Zambian marketplace where buyers and sellers can trade with confidence.`}>
      <div className="zemba-legal">
        <h2>Why we built it</h2>
        <p>Many people in Zambia want to buy and sell online but worry about paying someone they have never met. Buyers fear paying and getting nothing. Sellers fear sending goods and not being paid. Zemba removes that fear by sitting safely in the middle.</p>

        <h2>How we keep it safe</h2>
        <ul>
          <li><strong>Escrow.</strong> Your money is held by Zemba and goes to the seller only after you confirm that the item arrived.</li>
          <li><strong>Checked sellers.</strong> Every seller and every product is approved before it appears. Sellers can also have their NRC checked to earn a Verified badge.</li>
          <li><strong>Real track records.</strong> Every shop shows orders completed, dispatch speed and disputes. Reviews come only from buyers who received the item.</li>
          <li><strong>Built for how Zambia ships.</strong> Sellers send by bus or courier and record the waybill, so you can see where your item is and where to collect it.</li>
          <li><strong>A real person decides disputes.</strong> If something goes wrong, our team looks at the evidence and refunds you or pays the seller.</li>
        </ul>

        <h2>Who we are</h2>
        <p>{SITE.name} is built and run by {SITE.legalName}, a Zambian technology company. We want local sellers to grow and local buyers to feel safe.</p>

        <h2>Say hello</h2>
        <p>Questions, ideas or feedback? We would love to hear from you. Visit our <a href="/contact">contact page</a>, or read <a href="/how-it-works">how Zemba works</a>.</p>
      </div>
    </InfoPage>
  );
}
