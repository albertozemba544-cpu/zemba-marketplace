import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Database wrapper that provides a consistent interface
 * using Supabase client methods instead of SQLite
 */
export const db = {
  prepare: (sql: string) => ({
    get: async (params: any[]) => {
      const result = await executeQuery(sql, params);
      return result.data ? result.data[0] : undefined;
    },
    all: async (params: any[]) => {
      const result = await executeQuery(sql, params);
      return result.data || [];
    },
    run: async (...params: any[]) => {
      const result = await executeQuery(sql, params);
      return result;
    },
  }),
  query: async (sql: string, params: any[] = []) => {
    return await executeQuery(sql, params);
  },
  exec: async (sql: string) => {
    // For schema initialization, this is handled by Supabase migrations
    console.log('Schema initialization handled by Supabase');
    return null;
  },
};

async function executeQuery(sql: string, params: any[] = []) {
  try {
    const { data, error } = await supabase.rpc('execute_query', {
      query: sql,
      params: params,
    }).catch(() => {
      // Fallback: use raw query through Supabase client
      return supabase.from('query_executor').select().throwOnError();
    });

    if (error) {
      console.error('Database Query Error:', { sql, params, error });
      throw error;
    }

    return { rows: data, rowCount: data?.length || 0 };
  } catch (error) {
    console.error('Database Query Error:', { sql, params, error });
    throw error;
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
  newsletter_opt_in: number;
  ban_reason: string | null;
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Error fetching user by email:', error);
    return undefined;
  }

  return data as User | undefined;
}

export async function findUserById(id: string): Promise<User | undefined> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching user by id:', error);
    return undefined;
  }

  return data as User | undefined;
}

export async function listAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, role, full_name, business_name, phone_number, email, approval_status, account_status, user_category, newsletter_opt_in, ban_reason, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error listing users:', error);
    return [];
  }

  return data as User[];
}

export async function getOrderByReference(reference: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_reference', reference)
    .single();

  if (error) {
    console.error('Error fetching order:', error);
    return undefined;
  }

  return data;
}

export async function logEvent(orderId: string, eventType: string, payload: unknown) {
  const { error } = await supabase
    .from('transaction_events')
    .insert({
      id: randomUUID(),
      order_id: orderId,
      event_type: eventType,
      payload: JSON.stringify(payload),
    });

  if (error) {
    console.error('Error logging event:', error);
  }
}
