import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';

/**
 * Browser-side Supabase client (uses the public anon/publishable key).
 * Access is governed by RLS — currently relaxed by the demo policies.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/** Single-tenant demo organization (seeded in migration 0002). */
export const DEMO_ORG_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
