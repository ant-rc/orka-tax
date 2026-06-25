-- Migration: 0006_two_demo_profiles
-- DEMO ONLY — establish two distinct organizations so the login (company ID)
-- routes to different portfolios. Org A is the existing demo (45+ lots); org B
-- is a new, smaller Atlantic-coast portfolio.

-- ============================================================
-- Org A — fixed identity for the existing demo portfolio
-- ============================================================
update public.organizations
set name = 'Cabinet Démo Patrimoine', company_id = '552 081 317'
where id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- ============================================================
-- Org B — new organization with its own company ID
-- ============================================================
insert into public.organizations (id, name, company_id) values
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Foncière Atlantique', '843 119 204')
on conflict (id) do update
  set name = excluded.name, company_id = excluded.company_id;

-- Clean reseed of org B portfolio (idempotent)
delete from public.biens where org_id = 'aaaaaaaa-0000-0000-0000-000000000002';
delete from public.lots  where org_id = 'aaaaaaaa-0000-0000-0000-000000000002';

-- ============================================================
-- Org B LOTS — 12 Atlantic-coast dossiers (UPPER CASE, city name only)
-- ============================================================
insert into public.lots (id, org_id, name, address, city) values
  ('22222222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', '17000-VIEUX-PORT',   '5 QUAI DULUC',            'LA ROCHELLE'),
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', '33120-ARCACHON',     '14 BOULEVARD DE LA PLAGE','ARCACHON'),
  ('22222222-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', '64200-BIARRITZ',     '8 AVENUE EDOUARD VII',    'BIARRITZ'),
  ('22222222-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000002', '29000-LOCRONAN',     '3 RUE DU GUEODET',        'QUIMPER'),
  ('22222222-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000002', '56000-SAINT-PATERN', '21 RUE DES HALLES',       'VANNES'),
  ('22222222-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000002', '85100-REMBLAI',      '12 PROMENADE GEORGES CLEMENCEAU', 'LES SABLES-D''OLONNE'),
  ('22222222-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000002', '17200-ROYAN',        '6 BOULEVARD GARNIER',     'ROYAN'),
  ('22222222-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000002', '44500-BAULE',        '30 AVENUE DU GENERAL DE GAULLE', 'LA BAULE'),
  ('22222222-0000-0000-0000-000000000009', 'aaaaaaaa-0000-0000-0000-000000000002', '35400-INTRA-MUROS',  '9 RUE JACQUES CARTIER',   'SAINT-MALO'),
  ('22222222-0000-0000-0000-000000000010', 'aaaaaaaa-0000-0000-0000-000000000002', '22000-CHARNER',      '4 RUE SAINT-GUILLAUME',   'SAINT-BRIEUC'),
  ('22222222-0000-0000-0000-000000000011', 'aaaaaaaa-0000-0000-0000-000000000002', '40100-SPLENDID',     '18 COURS DE VERDUN',      'DAX'),
  ('22222222-0000-0000-0000-000000000012', 'aaaaaaaa-0000-0000-0000-000000000002', '17630-LA-FLOTTE',    '2 RUE DU MARCHE',         'LA FLOTTE');

-- ============================================================
-- Org B BIENS — 3 per lot, statut spread across the tunnel
-- ============================================================
insert into public.biens
  (org_id, lot_id, invariant_cadastral, rue, ville, nature, etage, surface_m2, statut)
select
  l.org_id,
  l.id,
  to_char(g, 'FM000') || replace(l.id::text, '-', ''),
  l.address,
  l.city,
  (array['Appartement', 'Cave', 'Parking'])[((g - 1) % 3) + 1],
  ((g - 1) % 5)::text,
  (array[30, 14, 48, 7, 62])[((g - 1) % 5) + 1],
  (array[
    'importe', 'rapprochement', 'resolu', 'analyse',
    'anomalie', 'reclamation', 'remboursement'
  ]::public.bien_statut[])[((g - 1) % 7) + 1]
from public.lots l
cross join generate_series(1, 3) as g
where l.org_id = 'aaaaaaaa-0000-0000-0000-000000000002';
