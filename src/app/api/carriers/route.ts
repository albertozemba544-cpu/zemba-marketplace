export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { handleError } from '@/lib/http';

// The bus companies and couriers a seller can choose when dispatching an order.
// Edit the list in Supabase -> Table Editor -> carriers.
export async function GET() {
  try {
    const carriers = await query('SELECT id, name, kind FROM carriers WHERE active = true ORDER BY sort_order, name');
    return NextResponse.json({ carriers });
  } catch (error) {
    return handleError(error);
  }
}
