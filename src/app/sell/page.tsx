import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import { SITE } from '@/lib/site';
import { kwacha } from '@/lib/fees';

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
          <li>Open a seller account with your NRC number, town and the MTN, Airtel or Zamtel mobile money number you want to be paid on.</li>
          <li>Your shop is ready as soon as you register (confirm your email if we ask you to).</li>
          <li>Add your products with clear photos, honest descriptions and the right price. Products go live straight away. Automatic checks and buyers' reports keep the marketplace clean, and anything suspicious is hidden until our team has looked at it.</li>
          <li>Optional but powerful: ask for a short video call to check your ID and earn the <strong>Verified seller</strong> badge.</li>
          <li>When an order is paid, send the item within {SITE.dispatchDays} days and upload a photo of the waybill or receipt.</li>
          <li>The buyer enters their delivery code, and your payout is sent to your mobile money.</li>
        </ol>

        <h2>What it costs</h2>
        <p>There is no fee to open a shop or to list items. When you make a sale, Zemba keeps a commission of {SITE.feePercent}% of the item price, and you receive the rest. Buyers pay their own buyer protection fee on top of your price, so it is never taken out of your price. Each order must be at least {kwacha(SITE.minOrder)}.</p>
        <h2>Shipping is paid by the buyer</h2>
        <p>When you list an item you choose how shipping works. You can offer free shipping (the cost is already in your price), or set a shipping price for each town. You know what the bus or courier charges to each place, so you set the prices and buyers see the price for their town before they pay. The buyer pays the item and the shipping in one payment. You receive the shipping money with your payout, and Zemba takes no commission on it, so you are never out of pocket when you pay the bus or courier.</p>
        <p>For example, if you sell an item for K200, Zemba keeps K{(200 * SITE.feePercent) / 100} and you are paid K{200 - (200 * SITE.feePercent) / 100}. We send your payout as soon as we can after delivery is confirmed, and you can follow it on your Payouts page.</p>

        <h2>The rules in short</h2>
        <ul>
          <li>Sell only real items you have, described honestly, with your own photos.</li>
          <li>Send within {SITE.dispatchDays} days of payment. If you do not, the buyer is refunded in full and a refund charge of {SITE.sellerChargePercent}% of the item price (minimum {kwacha(SITE.sellerChargeMin)}) is deducted from your next payouts.</li>
          <li>Never ask a buyer to pay outside Zemba, and never ask for their delivery code.</li>
        </ul>
        <p>Read the full <a href="/terms">Terms of Use</a> and <a href="/refund-policy">Refund Policy</a> before you start.</p>
      </div>
    </InfoPage>
  );
}
