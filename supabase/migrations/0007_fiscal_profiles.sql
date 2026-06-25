-- Migration: 0007_fiscal_profiles
-- DEMO ONLY — introduce a fiscal-profile layer (one numéro fiscal = one commune)
-- between organizations (the account) and lots. Reseed both demo accounts so each
-- profile's lots all live in a single commune (depcom). Idempotent / additive.

-- ============================================================
-- TABLE: fiscal_profiles  (NB: distinct from auth `profiles`)
-- ============================================================
create table if not exists public.fiscal_profiles (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  numero_fiscal text not null,
  label         text not null,
  depcom        text,
  commune       text,
  created_at    timestamptz not null default now()
);

alter table public.fiscal_profiles enable row level security;

drop policy if exists "demo public read"  on public.fiscal_profiles;
drop policy if exists "demo public write" on public.fiscal_profiles;
create policy "demo public read"  on public.fiscal_profiles for select using (true);
create policy "demo public write" on public.fiscal_profiles for all using (true) with check (true);

-- lots get scoped to a fiscal profile
alter table public.lots add column if not exists fiscal_profile_id uuid
  references public.fiscal_profiles(id) on delete cascade;

-- ============================================================
-- Clean reseed of both demo accounts (zone coherence)
-- ============================================================
delete from public.biens
  where org_id in ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');
delete from public.lots
  where org_id in ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');
delete from public.fiscal_profiles
  where org_id in ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');

-- Fiscal profiles: org A (3 communes), org B (2 communes)
insert into public.fiscal_profiles (id, org_id, numero_fiscal, label, depcom, commune) values
  ('f1111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '75 111 0012 345', 'Paris 11e',    '75111', 'PARIS'),
  ('f1111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '69 383 0008 210', 'Lyon 3e',      '69383', 'LYON'),
  ('f1111111-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '13 206 0021 044', 'Marseille 6e', '13206', 'MARSEILLE'),
  ('f2222222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', '17 300 0005 118', 'La Rochelle',  '17300', 'LA ROCHELLE'),
  ('f2222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', '64 122 0003 902', 'Biarritz',     '64122', 'BIARRITZ');

-- Lots per profile — all addresses within the profile's commune.
-- Each INSERT uses its own street set so the data stays realistic per zone.
insert into public.lots (org_id, fiscal_profile_id, name, address, city)
select fp.org_id, fp.id, fp.depcom || '-' || s.slug, s.street, fp.commune
from public.fiscal_profiles fp
join (values
  ('75111', 'OBERKAMPF',  '34 RUE OBERKAMPF'),
  ('75111', 'PARMENTIER', '12 AVENUE PARMENTIER'),
  ('75111', 'ROQUETTE',   '8 RUE DE LA ROQUETTE'),
  ('75111', 'VOLTAIRE',   '50 BOULEVARD VOLTAIRE'),
  ('75111', 'CHARONNE',   '21 RUE DE CHARONNE'),
  ('75111', 'NATION',     '3 PLACE DE LA NATION'),
  ('69383', 'LAFAYETTE',  '8 COURS LAFAYETTE'),
  ('69383', 'PART-DIEU',  '17 RUE GARIBALDI'),
  ('69383', 'MANUFACTURE','5 RUE DE LA MANUFACTURE'),
  ('69383', 'SAXE',       '40 AVENUE MARECHAL DE SAXE'),
  ('69383', 'PAUL-BERT',  '22 RUE PAUL BERT'),
  ('13206', 'PRADO',      '120 AVENUE DU PRADO'),
  ('13206', 'CASTELLANE', '9 PLACE CASTELLANE'),
  ('13206', 'PERIER',     '56 BOULEVARD PERIER'),
  ('13206', 'BAILLE',     '14 BOULEVARD BAILLE'),
  ('13206', 'LODI',       '3 RUE DE LODI'),
  ('17300', 'VIEUX-PORT', '5 QUAI DULUC'),
  ('17300', 'GABUT',      '11 RUE DU GABUT'),
  ('17300', 'VERDIERE',   '7 RUE DE LA VERDIERE'),
  ('17300', 'CHAINE',     '2 RUE DE LA CHAINE'),
  ('64122', 'GRANDE-PLAGE','8 AVENUE EDOUARD VII'),
  ('64122', 'PORT-VIEUX', '3 RUE DU PORT VIEUX'),
  ('64122', 'GAMBETTA',   '25 AVENUE GAMBETTA'),
  ('64122', 'HALLES',     '6 RUE DES HALLES')
) as s(depcom, slug, street) on s.depcom = fp.depcom;

-- Biens — 3 per lot, depcom/ville derived from the profile, statut spread.
insert into public.biens
  (org_id, lot_id, invariant_cadastral, rue, depcom, ville, nature, etage, surface_m2, statut)
select
  l.org_id, l.id,
  to_char(g, 'FM000') || replace(l.id::text, '-', ''),
  l.address, fp.depcom, fp.commune,
  (array['Appartement', 'Cave', 'Parking'])[((g - 1) % 3) + 1],
  ((g - 1) % 5)::text,
  (array[28, 12, 42, 6, 65])[((g - 1) % 5) + 1],
  (array[
    'importe', 'rapprochement', 'resolu', 'analyse',
    'anomalie', 'reclamation', 'remboursement'
  ]::public.bien_statut[])[((g - 1) % 7) + 1]
from public.lots l
join public.fiscal_profiles fp on fp.id = l.fiscal_profile_id
cross join generate_series(1, 3) as g
where l.org_id in ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');
