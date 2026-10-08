import type { Metadata } from 'next';
import InfoPage from '@/components/InfoPage';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Terms of Use', description: `The rules for buying and selling on ${SITE.name}.` };

export default function TermsPage() {
  return (
    <InfoPage eyebrow="Legal" title="Terms of Use" intro={`The rules for buying and selling on ${SITE.name}. Please read them before you create an account.`}>
      <div className="zemba-legal">
        <p className="zemba-legal-meta">Last updated {SITE.legalUpdated}</p>
        <div className="zemba-legal-note">
          <strong>In short</strong>
          Buyers pay into escrow, sellers ship, and the money is released to the seller only when the buyer confirms delivery with their delivery code. If something goes wrong, we step in. See our <a href="/refund-policy">Refund Policy</a> for the details.
        </div>

        <h2>1. About these terms</h2>
        <p>{SITE.name} (&quot;Zemba&quot;, &quot;we&quot;, &quot;us&quot;) is run by {SITE.legalName}{SITE.registrationNumber ? `, registration number ${SITE.registrationNumber}` : ''}{SITE.address ? `, ${SITE.address}` : ''}. By creating an account or using the website you agree to these terms, our <a href="/privacy">Privacy Policy</a> and our <a href="/refund-policy">Refund Policy</a>. If you do not agree, please do not use the website.</p>
        <p>Zemba is a marketplace. Items are sold by independent sellers, not by Zemba. We provide the website and the escrow service that holds the buyer&apos;s payment until delivery is confirmed. We do not own, store, inspect or deliver the items.</p>

        <h2>2. Your account</h2>
        <ul>
          <li>You must be 18 or older to create an account.</li>
          <li>Give true and complete information, and keep it up to date. One person, one account.</li>
          <li>Keep your password private. You are responsible for everything done through your account. Tell us at once if you think someone else has used it.</li>
          <li>We may ask you to confirm your email address.</li>
          <li>Seller accounts must be approved by us before they can log in or list products. We may refuse or remove an account if we are not satisfied with the details given.</li>
        </ul>

        <h2>3. How an order works</h2>
        <ol>
          <li>The buyer adds an item to the cart and pays through the website. The money goes into escrow and is not given to the seller yet.</li>
          <li>The seller must send the item within 3 days of the payment being confirmed and upload proof of dispatch, such as a photo of the waybill or receipt.</li>
          <li>The buyer receives the item, checks it, and enters the 6-digit delivery code shown on the order page.</li>
          <li>When the code is entered, the money is released to the seller, less the Zemba fee.</li>
        </ol>
        <p>If the seller does not send the item, or the item does not arrive, the buyer is protected as explained in section 6 and in the <a href="/refund-policy">Refund Policy</a>.</p>

        <h2>4. Prices, payments and fees</h2>
        <ul>
          <li>Prices are in Zambian kwacha (ZMW). The price on the listing is the price the buyer pays through Zemba. Any delivery arrangement or charge must be clear in the listing or agreed in writing between buyer and seller.</li>
          <li>Zemba charges the seller a fee of {SITE.feePercent}% of the sale price. It is taken out of the amount paid to the seller. At the time of writing, buyers pay no extra Zemba fee.</li>
          <li>We may change the fee. A change does not affect orders that have already been paid, and we will announce it on the website before it starts.</li>
          <li>Payments and payouts go through mobile money (MTN or Airtel) or other payment providers we choose. Their own terms and any charges they apply also apply.</li>
          <li>Sellers are responsible for any tax that applies to their sales.</li>
        </ul>

        <h2>5. The delivery code</h2>
        <p>The delivery code is for the buyer only. Enter it only after you have the item in your hands and are happy with it. Entering the code releases the money to the seller, and after that the order can no longer be disputed on Zemba. Never give the code to a seller, courier or anyone else before you have received the item. Sellers must never ask a buyer for the code before delivery.</p>

        <h2>6. If something goes wrong</h2>
        <ul>
          <li>If a seller does not send the item in time, the buyer is refunded automatically.</li>
          <li>While an order is paid and not yet confirmed, the buyer can open a dispute from the order page. Buyer and seller can then send messages, and a Zemba administrator reviews the case.</li>
          <li>The administrator decides either to refund the buyer or to release the money to the seller. We will explain the decision. Inside the Zemba website our decision on how the escrowed money is paid out is final, but it does not limit any rights you have under Zambian law.</li>
          <li>Full details are in our <a href="/refund-policy">Refund Policy</a>.</li>
        </ul>

        <h2>7. Rules for sellers</h2>
        <ul>
          <li>Provide your real name, NRC number, location and the mobile money number that payouts should be sent to. Check that number carefully. We are not responsible for a payout sent to the number you gave us.</li>
          <li>Every listing must be approved by us before it appears. Changing a title, description or photo of a listing may send it back for approval.</li>
          <li>Listings must be honest: true descriptions, your own real photos, correct prices and stock. The item you send must match the listing.</li>
          <li>Send the item within 3 days of payment, with a real proof of dispatch, and set a realistic delivery window.</li>
          <li>Do not ask buyers to pay outside Zemba, and do not ask for the delivery code.</li>
          <li>When you send an order by bus or courier, record the company, the waybill number, where the buyer collects it, and upload a photo of the waybill or receipt. The photo must be real and show this order.</li>
          <li>Sellers can ask for a <strong>Verified seller</strong> badge by sending a photo of their NRC and a selfie. The badge means we checked that ID when we looked at it. It is not a promise about the seller&apos;s honesty or the quality of their items, and we may remove it at any time, for example after complaints or if we find the details were false.</li>
          <li>Buyers can see your track record: how long you have been on Zemba, orders completed, how quickly you dispatch, and how many orders were disputed. These numbers come from the website&apos;s own records and cannot be edited.</li>
          <li>Answer buyers and cooperate if there is a dispute.</li>
          <li>Payouts are sent to your registered mobile money number after delivery is confirmed or after a dispute is decided in your favour. You can follow each payout on your Payouts page.</li>
        </ul>

        <h2>8. What you must not do</h2>
        <ul>
          <li>Sell or buy anything illegal, stolen, counterfeit, dangerous or harmful, including weapons, illegal drugs and anything you have no right to sell.</li>
          <li>Post false, misleading or offensive listings, reviews or messages.</li>
          <li>Try to cheat the escrow system, for example by making false claims, creating fake accounts or fake orders.</li>
          <li>Try to break into the website, interfere with it, or collect other people&apos;s information.</li>
          <li>Use the website to harass or threaten anyone.</li>
        </ul>

        <h2>9. Reviews and content you post</h2>
        <p>Only buyers who have received an item (they entered their delivery code) can review it, and the review is marked as a verified purchase. Reviews and messages must be honest and based on your own experience. Reviews written by sellers, friends or family to boost sales are not allowed. You allow us to show them on the website. We may remove content that breaks these terms.</p>

        <h2>10. Our responsibility</h2>
        <p>We work to keep Zemba safe and running, but we cannot promise it will always be available or free of errors. We are not the seller of the items and do not guarantee their quality, safety or legality, although the escrow and dispute process is there to protect buyers. To the extent the law allows, we are not liable for indirect losses, and our total liability for any single order is limited to the amount paid for that order. Nothing in these terms removes any right you have under Zambian consumer protection law, or limits liability that cannot be limited by law.</p>

        <h2>11. Suspending or closing accounts</h2>
        <p>We may suspend or close an account, remove listings, or hold payouts where we reasonably believe these terms have been broken, where fraud is suspected, or where the law requires it. You may stop using Zemba at any time. Orders already paid still follow the escrow process.</p>

        <h2>12. Changes to these terms</h2>
        <p>We may update these terms. The date at the top shows when they last changed. If you keep using Zemba after a change, you accept the new terms. Orders already paid are not affected by changes made later.</p>

        <h2>13. Governing law</h2>
        <p>These terms are governed by the laws of the Republic of Zambia, and the courts of Zambia can hear any dispute about them.</p>

        <h2>14. Contact us</h2>
        <p>Questions about these terms? Use our <a href="/contact">contact page</a>{SITE.email ? <> or email <a href={`mailto:${SITE.email}`}>{SITE.email}</a></> : null}.</p>
      </div>
    </InfoPage>
  );
}
