-- Migration: 0005_bien_statut_tunnel_and_demo_write
-- The UI shows a 7-stage qualification tunnel for a bien, but the base
-- bien_status enum only covered draft/validated/archived. Add a dedicated
-- tunnel status column. Also open DEMO write access on lots/biens so the
-- still-unauthenticated demo can create/delete rows (remove with real auth).

-- ============================================================
-- Tunnel status: importe → … → remboursement
-- ============================================================
create type public.bien_statut as enum (
  'importe', 'rapprochement', 'resolu', 'analyse',
  'anomalie', 'reclamation', 'remboursement'
);

alter table public.biens
  add column if not exists statut public.bien_statut not null default 'importe';

-- Spread the demo biens across the tunnel so the dashboard shows variety.
with ordered as (
  select id, row_number() over (order by created_at, id) as rn
  from public.biens
  where org_id = 'aaaaaaaa-0000-0000-0000-000000000001'
)
update public.biens b
set statut = (array[
  'importe', 'rapprochement', 'resolu', 'analyse',
  'anomalie', 'reclamation', 'remboursement'
]::public.bien_statut[])[((o.rn - 1) % 7) + 1]
from ordered o
where b.id = o.id;

-- ============================================================
-- DEMO ONLY — anon write access on lots/biens (remove with real auth)
-- ============================================================
drop policy if exists "demo public write" on public.lots;
drop policy if exists "demo public write" on public.biens;
create policy "demo public write" on public.lots  for all using (true) with check (true);
create policy "demo public write" on public.biens for all using (true) with check (true);
