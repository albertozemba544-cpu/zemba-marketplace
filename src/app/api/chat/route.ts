import { NextRequest, NextResponse } from 'next/server';

const answers = [
  { keywords: ['cart', 'basket'], answer: 'Open Cart in the header to review items. You can remove products there, then choose Proceed to checkout.' },
  { keywords: ['buy', 'purchase', 'order', 'checkout'], answer: 'Choose a product, add it to your cart, and continue to checkout. Your payment is held in escrow until delivery is confirmed.' },
  { keywords: ['sell', 'seller', 'store', 'listing'], answer: 'Choose Sell on Zemba or Start selling to create a seller account. After approval, you can add listings from your seller dashboard.' },
  { keywords: ['review', 'rating', 'comment'], answer: 'Open a product page to read customer comments and leave a product and seller rating. You need a customer account to post.' },
  { keywords: ['payment', 'escrow', 'money'], answer: 'Zemba holds your payment safely in escrow while the seller prepares your order. Funds are released after you confirm delivery.' },
  { keywords: ['delivery', 'shipping', 'deliver'], answer: 'Delivery is coordinated by the seller. You can follow order progress from your checkout and order confirmation pages.' },
  { keywords: ['account', 'login', 'sign in', 'password'], answer: 'Use Log in to access your customer account, or Register to create one. Seller and admin accounts have separate login pages.' },
  { keywords: ['suggestion', 'feedback', 'contact', 'help'], answer: 'Use the Suggestion box in the footer to send the Zemba team an idea or report an experience.' },
];

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  const text = String(message || '').toLowerCase();
  const match = answers.find((item) => item.keywords.some((keyword) => text.includes(keyword)));
  return NextResponse.json({ answer: match?.answer || 'I can help with shopping, carts, checkout, sellers, reviews, delivery, payments, accounts, and suggestions. What would you like to know?' });
}
