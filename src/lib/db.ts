import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Database wrapper that provides a consistent interface using Supabase
 */
export const db = {
  prepare: (sql: string) => ({
    get: async (params: any[] = []) => {
      try {
        return await executePreparedQuery(sql, params, 'single');
      } catch (error) {
        console.error('DB get error:', error);
        return undefined;
      }
    },
    all: async (params: any[] = []) => {
      try {
        return await executePreparedQuery(sql, params, 'all');
      } catch (error) {
        console.error('DB all error:', error);
        return [];
      }
    },
    run: async (...params: any[]) => {
      try {
        return await executePreparedQuery(sql, params, 'run');
      } catch (error) {
        console.error('DB run error:', error);
        return { rowCount: 0, changes: 0 };
      }
    },
  }),
  query: async (sql: string, params: any[] = []) => {
    try {
      const result = await executePreparedQuery(sql, params, 'all');
      return { rows: result, rowCount: Array.isArray(result) ? result.length : 0 };
    } catch (error) {
      console.error('DB query error:', error);
      return { rows: [], rowCount: 0 };
    }
  },
  exec: async (sql: string) => {
    console.log('Schema initialization is managed by Supabase SQL Editor');
    return null;
  },
};

async function executePreparedQuery(sql: string, params: any[] = [], mode: 'single' | 'all' | 'run' = 'all') {
  // Parse the SQL to determine operation type and table
  const sqlLower = sql.toLowerCase().trim();
  
  if (sqlLower.startsWith('select')) {
    return await executeSelectQuery(sql, params, mode);
  } else if (sqlLower.startsWith('insert')) {
    return await executeInsertQuery(sql, params);
  } else if (sqlLower.startsWith('update')) {
    return await executeUpdateQuery(sql, params);
  } else if (sqlLower.startsWith('delete')) {
    return await executeDeleteQuery(sql, params);
  } else if (sqlLower.startsWith('create') || sqlLower.startsWith('alter')) {
    console.log('DDL statements are handled by Supabase migrations');
    return null;
  }

  throw new Error(`Unsupported SQL operation: ${sql.substring(0, 50)}`);
}

async function executeSelectQuery(sql: string, params: any[] = [], mode: 'single' | 'all' = 'all') {
  // Extract table name from SQL
  const tableMatch = sql.match(/from\s+(\w+)/i);
  if (!tableMatch) throw new Error('Cannot extract table from SELECT query');

  const table = tableMatch[1];
  let query = supabase.from(table).select('*');

  // Simple parameter binding - assumes WHERE conditions match parameter order
  if (sql.includes('WHERE') && params.length > 0) {
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER|LIMIT|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1].trim();
      // Parse simple WHERE conditions like "email = ?" or "id = ?"
      const conditions = whereClause.split('AND').map(c => c.trim());
      
      conditions.forEach((condition, index) => {
        const eqMatch = condition.match(/(\w+)\s*=\s*\?/);
        if (eqMatch && params[index] !== undefined) {
          query = query.eq(eqMatch[1], params[index]);
        }
      });
    }
  }

  // Handle ORDER BY
  if (sql.includes('ORDER BY')) {
    const orderMatch = sql.match(/ORDER BY\s+(\w+)\s+(ASC|DESC)?/i);
    if (orderMatch) {
      query = query.order(orderMatch[1], { ascending: orderMatch[2]?.toUpperCase() !== 'DESC' });
    }
  }

  // Handle LIMIT
  if (sql.includes('LIMIT')) {
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      query = query.limit(parseInt(limitMatch[1]));
    }
  }

  const { data, error } = await query;

  if (error) throw error;

  return mode === 'single' ? data?.[0] : data;
}

async function executeInsertQuery(sql: string, params: any[] = []) {
  const tableMatch = sql.match(/INTO\s+(\w+)/i);
  if (!tableMatch) throw new Error('Cannot extract table from INSERT query');

  const table = tableMatch[1];
  const columnsMatch = sql.match(/\(([^)]+)\)/);
  if (!columnsMatch) throw new Error('Cannot extract columns from INSERT query');

  const columns = columnsMatch[1].split(',').map(c => c.trim());
  const values: any = {};

  columns.forEach((col, index) => {
    values[col] = params[index];
  });

  const { error } = await supabase.from(table).insert([values]);
  if (error) throw error;

  return { rowCount: 1, changes: 1 };
}

async function executeUpdateQuery(sql: string, params: any[] = []) {
  const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
  if (!tableMatch) throw new Error('Cannot extract table from UPDATE query');

  const table = tableMatch[1];
  const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
  if (!setMatch) throw new Error('Cannot extract SET clause from UPDATE query');

  const updates: any = {};
  const setClauses = setMatch[1].split(',').map(c => c.trim());
  let paramIndex = 0;

  setClauses.forEach(clause => {
    const eqMatch = clause.match(/(\w+)\s*=\s*\?/);
    if (eqMatch && params[paramIndex] !== undefined) {
      updates[eqMatch[1]] = params[paramIndex];
      paramIndex++;
    }
  });

  // Parse WHERE condition
  const whereMatch = sql.match(/WHERE\s+(.+?)$/i);
  if (!whereMatch) throw new Error('UPDATE requires WHERE clause');

  const whereCondition = whereMatch[1].trim();
  const eqMatch = whereCondition.match(/(\w+)\s*=\s*\?/);
  if (!eqMatch) throw new Error('Cannot parse WHERE condition');

  let query = supabase.from(table).update(updates);
  query = query.eq(eqMatch[1], params[paramIndex]);

  const { error } = await query;
  if (error) throw error;

  return { rowCount: 1, changes: 1 };
}

async function executeDeleteQuery(sql: string, params: any[] = []) {
  const tableMatch = sql.match(/FROM\s+(\w+)/i);
  if (!tableMatch) throw new Error('Cannot extract table from DELETE query');

  const table = tableMatch[1];
  const whereMatch = sql.match(/WHERE\s+(.+?)$/i);
  if (!whereMatch) throw new Error('DELETE requires WHERE clause');

  const whereCondition = whereMatch[1].trim();
  const eqMatch = whereCondition.match(/(\w+)\s*=\s*\?/);
  if (!eqMatch) throw new Error('Cannot parse WHERE condition');

  let query = supabase.from(table).delete();
  query = query.eq(eqMatch[1], params[0]);

  const { error } = await query;
  if (error) throw error;

  return { rowCount: 1, changes: 1 };
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
  created_at?: string;
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

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
    .maybeSingle();

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

  return (data as User[]) || [];
}

export async function getOrderByReference(reference: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_reference', reference)
    .maybeSingle();

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
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error logging event:', error);
  }
}
