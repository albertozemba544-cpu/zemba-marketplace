import { ProviderNotReadyError } from '../types';
import type { CollectionRequest, CollectionResult, PaymentProvider, TransferRequest, TransferResult, WebhookEvent, PaymentStatus } from '../types';

// LIPILA: ready to be filled in.
//
// 1. In Vercel add:  PAYMENT_PROVIDER=lipila   LIPILA_API_KEY=...   LIPILA_BASE_URL=...   PAYMENT_WEBHOOK_SECRET=...
//    (use the sandbox key and URL first, in the Preview environment only)
// 2. Fill in the five functions below with the calls from Lipila's API documents (the endpoints, the headers,
//    and how their statuses map to our PENDING / SUCCESS / FAILED). Each one has a note saying what it must return.
// 3. In Lipila's dashboard set the callback address to:  https://zemba.shop/api/payments/webhook
// Nothing else in the website needs to change.

function config() {
  const apiKey = process.env.LIPILA_API_KEY;
  const baseUrl = process.env.LIPILA_BASE_URL;
  if (!apiKey || !baseUrl) throw new ProviderNotReadyError('Lipila is not set up yet: LIPILA_API_KEY and LIPILA_BASE_URL are missing.');
  return { apiKey, baseUrl: baseUrl.replace(/\/$/, '') };
}

/** Turns the provider's own status word into ours. Fill in the words Lipila uses. */
export function mapStatus(providerStatus: string | undefined): PaymentStatus {
  const s = String(providerStatus || '').toUpperCase();
  if (['SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'PAID'].includes(s)) return 'SUCCESS';
  if (['FAILED', 'DECLINED', 'CANCELLED', 'EXPIRED', 'REJECTED'].includes(s)) return 'FAILED';
  return 'PENDING';
}

export class LipilaProvider implements PaymentProvider {
  readonly name = 'lipila';

  /** Start a payment from the buyer. Return the provider's reference, and either a redirectUrl, or instructions (e.g. "approve the prompt on your phone"). */
  async createCollection(_request: CollectionRequest): Promise<CollectionResult> {
    config();
    throw new ProviderNotReadyError('Lipila createCollection is not filled in yet (src/lib/payments/providers/lipila.ts).');
  }

  /** Ask Lipila what really happened to a payment. Return SUCCESS only when the money has arrived, and the amount if they give it. */
  async getCollectionStatus(_providerRef: string, _reference: string): Promise<{ status: PaymentStatus; amount?: number }> {
    config();
    throw new ProviderNotReadyError('Lipila getCollectionStatus is not filled in yet.');
  }

  /** Send money to a mobile money number (a seller payout or a buyer refund). */
  async createTransfer(_request: TransferRequest): Promise<TransferResult> {
    config();
    throw new ProviderNotReadyError('Lipila createTransfer is not filled in yet.');
  }

  /** Ask Lipila what really happened to a payout or refund. */
  async getTransferStatus(_providerRef: string, _reference: string): Promise<{ status: PaymentStatus; error?: string }> {
    config();
    throw new ProviderNotReadyError('Lipila getTransferStatus is not filled in yet.');
  }

  /** Check the webhook is really from Lipila (signature with PAYMENT_WEBHOOK_SECRET) and turn it into our event. Return null if it is not valid. */
  async parseWebhook(_rawBody: string, _headers: Headers): Promise<WebhookEvent | null> {
    throw new ProviderNotReadyError('Lipila parseWebhook is not filled in yet.');
  }
}
