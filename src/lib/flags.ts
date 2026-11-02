// Switches you control from Vercel -> Settings -> Environment Variables.

/** Pretend payments for testing. Off unless you set ALLOW_DEMO_PAYMENTS=true. */
export function demoPaymentsEnabled(): boolean {
  return process.env.ALLOW_DEMO_PAYMENTS === 'true';
}
