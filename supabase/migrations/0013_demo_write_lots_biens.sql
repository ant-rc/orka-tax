-- Migration: 0013_demo_write_lots_biens
-- DEMO ONLY — lets the (still unauthenticated) app persist imported lots and
-- their biens to Supabase from the anon client. These "demo public write"
-- policies MUST be removed together with the read/write policies from 0002/0003
-- once authentication + memberships are wired.

-- Idempotent: 0005 also (re)creates these policies, and they may already exist on
-- the live DB — drop first so a fresh `supabase db push` never fails on a duplicate.
drop policy if exists "demo public write" on public.lots;
drop policy if exists "demo public write" on public.biens;

create policy "demo public write" on public.lots
  for all using (true) with check (true);

create policy "demo public write" on public.biens
  for all using (true) with check (true);
