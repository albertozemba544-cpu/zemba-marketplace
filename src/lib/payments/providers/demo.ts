import type { CollectionRequest, CollectionResult, PaymentProvider, TransferRequest, TransferResult, WebhookEvent } from '../types';

// A pretend provider for testing the whole flow (checkout, automatic payouts, refunds, timers) with no real money.
// Turn it on with PAYMENT_PROVIDER=demo, for the Preview environment only.
export class DemoProvider implements PaymentProvider {
  readonly name = 'demo';
  async createCollection(request: CollectionRequest): Promise<CollectionResult> {
    return { providerRef: `DEMO-IN-${Date.now()}`, status: 'SUCCESS', instructions: `Demo payment of K${request.amount.toFixed(2)} (no real money).` };
  }
  async getCollectionStatus() { return { status: 'SUCCESS' as const }; }
  async createTransfer(request: TransferRequest): Promise<TransferResult> {
    return { providerRef: `DEMO-OUT-${Date.now()}`, status: 'SUCCESS' };
  }
  async getTransferStatus() { return { status: 'SUCCESS' as const }; }
  async parseWebhook(): Promise<WebhookEvent | null> { return null; }
}
