import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Sell on Zemba', description: `Open a shop on ${SITE.name} and sell to buyers across Zambia with protected payments.` };

export default function SellPage() {
  return (
    <InfoPage eyebrow="For sellers" title="Sell on Zemba" intro="Reach buyers across Zambia. Buyers pay into escrow before you ship, so you know the money is there.">
      <div className="zemba-legal">
        <p><a className="zemba-retail-cta" href="/register?role=seller" style={{ color: '#fff', textDecoration: 'none' }}>Open your shop <span>→</span></a>{' '}<a href="/seller/login" style={{ marginLeft: '1rem' }}>Already a seller? Log in</a></p>
      </div>

      <h2 className="zemba-info-h2">Why sell here</h2>
      <div className="zemba-steps-row">
        <div><span>✓</span><h3>Buyers trust you</h3><p>Escrow, verified sellers and real reviews make first-time buyers comfortable buying from you.</p></div>
        <div><span>K</span><h3>No payment worries</h3><p>When an order is paid, the money is already held for you. You are paid when the buyer confirms delivery.</p></div>
        <div><span>→</span><h3>Ship the way you already do</h3><p>Send by bus or courier and add the waybill. Buyers see where to collect their item.</p></div>
      </div>

      <h2 className="zemba-info-h2">How to start</h2>
      <div className="zemba-legal">
        <ol>
          <li>Open a seller account with your NRC number, town and the MTN or Airtel mobile money number you want to be paid on.</li>
          <li>We approve your account. This usually takes a day or two.</li>
          <li>Add your products with clear photos, honest descriptions and the right price. Each product is approved before it goes live.</li>
          <li>Optional but powerful: send a photo of your NRC and a selfie to earn the <strong>Verified seller</strong> badge.</li>
          <li>When an order is paid, send the item within 3 days and upload a photo of the waybill or receipt.</li>
          <li>The buyer enters their delivery code, and your payout is sent to your mobile money.</li>
        </ol>

        <h2>What it costs</h2>
        <p>There is no fee to open a shop. When you make a sale, Zemba keeps {SITE.feePercent}% of the sale price, and you receive the rest. Payouts are sent within {SITE.payoutWorkingDays} working days after delivery is confirmed.</p>

        <h2>The rules in short</h2>
        <ul>
          <li>Sell only real items you have, described honestly, with your own photos.</li>
          <li>Send within 3 days of payment. If you do not, the buyer is refunded.</li>
          <li>Never ask a buyer to pay outside Zemba, and never ask for their delivery code.</li>
        </ul>
        <p>Read the full <a href="/terms">Terms of Use</a> and <a href="/refund-policy">Refund Policy</a> before you start.</p>
      </div>
    </InfoPage>
  );
}
