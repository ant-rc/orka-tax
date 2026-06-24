-- Migration: 0002_demo_seed_and_public_read
-- DEMO ONLY — provides mock data so the (still unauthenticated) app can display
-- real Supabase rows. The "demo public read" policies expose SELECT to anon and
-- MUST be removed once authentication + memberships are wired (see 0003 later).

-- ============================================================
-- TEMPORARY public-read policies (anon SELECT) — DEMO, remove with auth
-- ============================================================
create policy "demo public read" on public.organizations for select using (true);
create policy "demo public read" on public.lots          for select using (true);
create policy "demo public read" on public.biens         for select using (true);

-- ============================================================
-- DEMO ORGANIZATION
-- ============================================================
insert into public.organizations (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Cabinet Démo Patrimoine');

-- ============================================================
-- DEMO LOTS (realistic French portfolio dossiers)
-- ============================================================
insert into public.lots (id, org_id, name, description) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '94077-VOLTA',        '12 RUE BIS SAINT… · Villeneuve-le-Roi'),
  ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '75011-OBERKAMPF',    '34 rue Oberkampf · Paris 75011'),
  ('11111111-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '69003-PART-DIEU',    '8 cours Lafayette · Lyon 69003'),
  ('11111111-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', '92100-BOULOGNE',     '15 avenue Jean-Baptiste Clément · Boulogne 92100'),
  ('11111111-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', '13006-PRADO',        '120 avenue du Prado · Marseille 13006'),
  ('11111111-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001', '33000-CHARTRONS',    '47 cours du Médoc · Bordeaux 33000'),
  ('11111111-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000001', '59000-VAUBAN',       '22 boulevard Vauban · Lille 59000'),
  ('11111111-0000-0000-0000-000000000008', 'aaaaaaaa-0000-0000-0000-000000000001', '06000-CARRE-DOR',    '5 rue de la Liberté · Nice 06000');

-- ============================================================
-- DEMO BIENS (canonical fields populated, spread across the first lots)
-- ============================================================
insert into public.biens
  (org_id, lot_id, invariant_cadastral, rue, depcom, ville, nom_immeuble, nature,
   ponderation_nature, etage, categorie, surface_m2,
   coeff_entretien, coeff_situation_particuliere, coeff_situation_generale,
   ascenseur, eau_courante, gaz, electricite, egout,
   nb_baignoires, nb_douches, nb_bidets, nb_wc, nb_eviers, nb_pieces, nb_vide_ordures,
   status, completeness, degrevement_estime)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '940770660134', '12 rue Bis Saint', '94077', 'Villeneuve-le-Roi', 'Résidence Volta',   'Appartement', 1,   '0', '4', 28,  1.10, 1.00, 1.05, false, true,  false, true,  true,  0, 1, 0, 1, 1, 2, 0, 'draft',     60, 0),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '940770660147', '12 rue Bis Saint', '94077', 'Villeneuve-le-Roi', 'Résidence Volta',   'Parking',     0.6, '0', '8', 12,  1.00, 0.95, 1.00, false, false, false, true,  false, 0, 0, 0, 0, 0, 1, 0, 'draft',     40, 0),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '940770660148', '12 rue Bis Saint', '94077', 'Villeneuve-le-Roi', 'Résidence Volta',   'Appartement', 1,   '1', '4', 28,  1.10, 1.00, 1.05, false, true,  true,  true,  true,  1, 0, 0, 1, 1, 2, 0, 'validated', 100, 312),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', '750110041201', '34 rue Oberkampf', '75111', 'Paris',             'Le Palladium',     'Appartement', 1,   '2', '3', 42,  1.15, 1.05, 1.10, true,  true,  true,  true,  true,  1, 1, 0, 1, 1, 3, 1, 'validated', 100, 540),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', '750110041202', '34 rue Oberkampf', '75111', 'Paris',             'Le Palladium',     'Appartement', 1,   '3', '3', 42,  1.15, 1.05, 1.10, true,  true,  true,  true,  true,  0, 1, 0, 1, 1, 3, 1, 'draft',     80, 0),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', '750110041203', '34 rue Oberkampf', '75111', 'Paris',             'Le Palladium',     'Parking',     0.6, '-1','8', 13,  1.00, 1.00, 1.05, true,  false, false, true,  false, 0, 0, 0, 0, 0, 1, 0, 'draft',     40, 0),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', '690030182401', '8 cours Lafayette','69383', 'Lyon',              'Tour Lafayette',   'Appartement', 1,   '5', '2', 65,  1.20, 1.10, 1.15, true,  true,  true,  true,  true,  1, 1, 1, 2, 1, 4, 1, 'validated', 100, 845),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', '690030182402', '8 cours Lafayette','69383', 'Lyon',              'Tour Lafayette',   'Appartement', 1,   '6', '2', 65,  1.20, 1.10, 1.15, true,  true,  true,  true,  true,  1, 0, 1, 2, 1, 4, 1, 'draft',     70, 0);

-- ============================================================
-- Keep org biens_count expectations simple — UI derives counts from queries.
-- ============================================================
