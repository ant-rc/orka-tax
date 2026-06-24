-- Migration: 0003_org_company_id_demo_write
-- DEMO ONLY — supports the (pre-auth) identification screen: on connect the app
-- upserts the company identity onto the demo organization.
-- The "demo public write" policy lets the anon client write organizations and
-- MUST be removed together with the read policies once auth is wired.

-- Company identifier captured at login ("Numéro ID de la boîte").
alter table public.organizations add column if not exists company_id text;

-- Allow anon to insert/update/delete organizations (DEMO — remove with auth).
create policy "demo public write" on public.organizations
  for all using (true) with check (true);
