import { NextResponse } from 'next/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Turns database errors into friendly responses and keeps internal details out of the browser. */
export function handleError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const code = (error as { code?: string } | null)?.code;
  if (code === '23505') return fail('That record already exists.', 409);
  if (code === '22P02' || code === '23503' || code === '23514') return fail('Invalid request.', 400);
  console.error(error);
  return fail(fallback, 500);
}
