import { NextRequest, NextResponse } from 'next/server';

const answers = [
  { keywords: ['cart', 'basket'], answer: 'Open Cart in the header to review items. You can remove products there, then choose Proceed to checkout.' },
  { keywords: ['buy', 'purchase', 'order', 'checkout'], answer: 'Choose a product, add it to your cart, and continue to checkout. Your payment is held in escrow until delivery is confirmed.' },
  { keywords: ['sell', 'seller', 'store', 'listing'], answer: 'Choose Sell on Zemba or Start selling to create a seller account. After approval, you can add listings from your seller dashboard.' },
  { keywords: ['review', 'rating', 'comment'], answer: 'Open a product page to read reviews. Only buyers who have received the item can review it, and those reviews are marked Verified purchase.' },
  { keywords: ['payment', 'escrow', 'money'], answer: 'Zemba holds your payment safely in escrow while the seller prepares your order. Funds are released after you confirm delivery.' },
  { keywords: ['delivery', 'shipping', 'deliver', 'waybill', 'bus', 'courier'], answer: 'Sellers send your item by bus or courier. Your order page shows the company, the waybill number, where to collect it and a photo of the waybill. When you have the item, enter your delivery code to release the payment.' },
  { keywords: ['account', 'login', 'sign in', 'password'], answer: 'Use Log in to access your customer account, or Register to create one. Seller and admin accounts have separate login pages.' },
  { keywords: ['suggestion', 'feedback', 'contact', 'help', 'whatsapp', 'phone'], answer: 'Open the Help centre or the Contact page to message the Zemba team, or use the WhatsApp link on the Contact page.' },
];

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  const text = String(message || '').toLowerCase();
  const match = answers.find((item) => item.keywords.some((keyword) => text.includes(keyword)));
  const notLive = process.env.PAYMENTS_LIVE === 'true' ? '' : ' Note: online payments are not open yet. We will announce when they are.';
  const money = match && ['buy', 'payment'].includes(match.keywords[0]) ? notLive : '';
  return NextResponse.json({ answer: (match ? match.answer + money : null) || 'I can help with shopping, carts, checkout, sellers, reviews, delivery, payments, accounts, and suggestions. What would you like to know?' });
}
