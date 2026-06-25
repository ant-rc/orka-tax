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

/**
 * Resolve the organization the user is working in. The identification page
 * stores it under `orka_org` in localStorage; falls back to the demo org.
 * Client-side only (reads localStorage).
 */
export function getActiveOrgId(): string {
  if (typeof window === 'undefined') return DEMO_ORG_ID;
  try {
    const raw = window.localStorage.getItem('orka_org');
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: string };
      if (parsed?.id) return parsed.id;
    }
  } catch {
    // Ignore malformed storage and use the demo org.
  }
  return DEMO_ORG_ID;
}
