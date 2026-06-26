-- Migration: 0013_demo_write_lots_biens
-- DEMO ONLY — lets the (still unauthenticated) app persist imported lots and
-- their biens to Supabase from the anon client. These "demo public write"
-- policies MUST be removed together with the read/write policies from 0002/0003
-- once authentication + memberships are wired.

create policy "demo public write" on public.lots
  for all using (true) with check (true);

create policy "demo public write" on public.biens
  for all using (true) with check (true);
