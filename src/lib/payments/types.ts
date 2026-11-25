// The contract between Zemba and a payment provider (Lipila, Lenco or anyone else).
//
// Zemba only talks to a provider through these functions. When the agreement is signed, one file in
// src/lib/payments/providers/ is filled in with that provider's API calls, the API key goes into Vercel,
// and the rest of the website (checkout, payouts, refunds, timers, alerts) already works.
//
// All amounts are in kwacha (ZMW) with up to 2 decimals. "reference" is always Zemba's own order reference,
// so a payment can be found again from either side.

export type MobileNetwork = 'MTN' | 'AIRTEL' | 'ZAMTEL';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

/** Money coming in from a buyer. */
export interface CollectionRequest {
  reference: string;          // Zemba order reference
  amount: number;             // item + shipping + buyer protection fee
  description: string;        // shown to the buyer, e.g. "Zemba order ZM123"
  buyerName: string;
  buyerEmail?: string;
  buyerPhone?: string;        // MSISDN in international format, e.g. 260971234567
  network?: MobileNetwork;    // if the buyer already chose mobile money
  callbackUrl: string;        // where the provider sends its result: /api/payments/webhook
  returnUrl: string;          // where the buyer goes after paying: the order page
}

export interface CollectionResult {
  providerRef: string;        // the provider's own number for this payment
  redirectUrl?: string;       // send the buyer here to pay (hosted checkout)
  instructions?: string;      // or tell the buyer what to do (for example approve the prompt on their phone)
  status: PaymentStatus;
}

/** Money going out: a payout to a seller, or a refund to a buyer. */
export interface TransferRequest {
  reference: string;          // Zemba order reference, plus a suffix such as -PAYOUT or -REFUND
  amount: number;
  phone: string;              // MSISDN in international format
  network?: MobileNetwork;
  description: string;
  callbackUrl: string;
}

export interface TransferResult {
  providerRef: string;
  status: PaymentStatus;
  error?: string;
}

/** What a provider's webhook tells us, after the provider has checked the signature. */
export interface WebhookEvent {
  kind: 'COLLECTION' | 'PAYOUT' | 'REFUND';
  reference: string;          // Zemba reference we sent (without the -PAYOUT / -REFUND suffix)
  providerRef: string;
  status: PaymentStatus;
  amount?: number;
  error?: string;
}

export interface PaymentProvider {
  /** Short lowercase name stored on the order, e.g. "lipila" */
  readonly name: string;

  /** Starts a payment from a buyer. */
  createCollection(request: CollectionRequest): Promise<CollectionResult>;

  /** Asks the provider for the real, current state of a collection. We never trust a webhook on its own. */
  getCollectionStatus(providerRef: string, reference: string): Promise<{ status: PaymentStatus; amount?: number }>;

  /** Pays a seller (or refunds a buyer) to a mobile money number. */
  createTransfer(request: TransferRequest): Promise<TransferResult>;

  /** Asks the provider for the real state of a payout or refund. */
  getTransferStatus(providerRef: string, reference: string): Promise<{ status: PaymentStatus; error?: string }>;

  /** Checks that a webhook really came from the provider and turns it into a WebhookEvent. Returns null if it is not valid. */
  parseWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent | null>;
}

export class ProviderNotReadyError extends Error {
  constructor(message = 'No payment provider is connected yet.') {
    super(message);
    this.name = 'ProviderNotReadyError';
  }
}
