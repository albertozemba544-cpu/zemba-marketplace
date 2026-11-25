import type { MobileNetwork } from './types';

/** 0971234567 or +260 97 123 4567 -> 260971234567 (the format payment providers expect). */
export function toMsisdn(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('260') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `260${digits.slice(1)}`;
  if (digits.length === 9) return `260${digits}`;
  return digits;
}

/** Works out the network from the number when we do not know it (for example a buyer's refund). */
export function guessNetwork(phone: string): MobileNetwork | undefined {
  const msisdn = toMsisdn(phone);
  const prefix = msisdn.slice(3, 5);
  if (prefix === '76' || prefix === '96') return 'MTN';
  if (prefix === '77' || prefix === '97') return 'AIRTEL';
  if (prefix === '75' || prefix === '95') return 'ZAMTEL';
  return undefined;
}

export function toNetwork(value: string | null | undefined, phone: string): MobileNetwork | undefined {
  const v = String(value || '').toUpperCase();
  if (v === 'MTN' || v === 'AIRTEL' || v === 'ZAMTEL') return v;
  return guessNetwork(phone);
}
