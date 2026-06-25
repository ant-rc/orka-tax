-- Migration: 0012_reclamations — per-lot réclamation aggregating bien dégrèvements.
create table if not exists public.reclamations (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizations(id) on delete cascade,
  fiscal_profile_id  uuid references public.fiscal_profiles(id) on delete set null,
  lot_id             uuid not null references public.lots(id) on delete cascade,
  total_degrevement  numeric not null default 0,
  statut             text not null default 'generee',
  created_at         timestamptz not null default now()
);
alter table public.reclamations enable row level security;
drop policy if exists "demo public read"  on public.reclamations;
drop policy if exists "demo public write" on public.reclamations;
create policy "demo public read"  on public.reclamations for select using (true);
create policy "demo public write" on public.reclamations for all using (true) with check (true);
