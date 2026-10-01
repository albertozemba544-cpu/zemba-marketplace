// Postgres (Supabase) access layer.
// Every API route talks to the database through the helpers in this file.

import { Pool, PoolClient, types } from 'pg';
import { randomUUID } from 'crypto';

// Postgres returns DECIMAL and COUNT() as strings. The pages expect numbers.
types.setTypeParser(1700, (value: string) => parseFloat(value)); // numeric / decimal
types.setTypeParser(20, (value: string) => parseInt(value, 10)); // bigint (COUNT)

const globalForPool = globalThis as unknown as { zembaPool?: Pool };

function createPool(): Pool {
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Add your Supabase connection string in Vercel environment variables.');
  }
  // sslmode in the URL would override the ssl option below and break Supabase certificates
  try {
    const url = new URL(connectionString);
    url.searchParams.delete('sslmode');
    connectionString = url.toString();
  } catch {
    /* leave the string as it is */
  }
  return new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function getPool(): Pool {
  if (!globalForPool.zembaPool) globalForPool.zembaPool = createPool();
  return globalForPool.zembaPool;
}

type Params = unknown[];

export async function query<T = any>(text: string, params: Params = []): Promise<T[]> {
  const result = await getPool().query(text, params as any[]);
  return result.rows as T[];
}

export async function queryOne<T = any>(text: string, params: Params = []): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

/** Runs a statement and returns how many rows it changed. */
export async function execute(text: string, params: Params = []): Promise<number> {
  const result = await getPool().query(text, params as any[]);
  return result.rowCount ?? 0;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export const PLATFORM_FEE_RATE = 0.025;

export function computeFees(amount: number) {
  const platform_fee = Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;
  const net_amount = Math.round((amount - platform_fee) * 100) / 100;
  return { platform_fee, net_amount };
}

export interface User {
  id: string;
  role: 'customer' | 'seller' | 'admin';
  full_name: string;
  business_name: string | null;
  phone_number: string;
  email: string;
  password_hash: string;
  momo_provider: string | null;
  momo_number: string | null;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  account_status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  user_category: string;
  newsletter_opt_in: boolean;
  ban_reason: string | null;
}

export function findUserByEmail(email: string) {
  return queryOne<User>('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
}

export function findUserById(id: string) {
  return queryOne<User>('SELECT * FROM users WHERE id = $1', [id]);
}

export function getOrderByReference(reference: string) {
  return queryOne<any>('SELECT * FROM orders WHERE order_reference = $1', [reference]);
}

export async function logEvent(orderId: string, eventType: string, payload: unknown, client?: PoolClient) {
  const runner = client ?? getPool();
  await runner.query(
    'INSERT INTO transaction_events (id, order_id, event_type, payload) VALUES ($1, $2, $3, $4::jsonb)',
    [randomUUID(), orderId, eventType, JSON.stringify(payload ?? {})]
  );
}
