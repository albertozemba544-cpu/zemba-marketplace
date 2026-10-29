// Switches you control from Vercel -> Settings -> Environment Variables.

/** Seller ID-photo checks (NRC + selfie). Off until you have legal advice on storing ID photos. */
export function idChecksEnabled(): boolean {
  return process.env.ID_VERIFICATION_ENABLED === 'true';
}

/** Pretend payments for testing. Off unless you set ALLOW_DEMO_PAYMENTS=true. */
export function demoPaymentsEnabled(): boolean {
  return process.env.ALLOW_DEMO_PAYMENTS === 'true';
}
