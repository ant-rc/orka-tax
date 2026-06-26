-- Migration: 0015_more_demo_biens
-- Flesh out the non-VOLTA lots with varied biens for a realistic demo (5 per lot,
-- varied surfaces and types). Values equal the FISC reference at insert (the
-- biens_fisc trigger snapshots them), so every new bien is conforme — no anomaly
-- until it is edited. Stays well under the 250-bien cap (127 + 120 = 247).

with template as (
  -- One reference bien per non-VOLTA lot, for org/address/coefficients.
  select distinct on (b.lot_id)
    b.lot_id, b.org_id, b.etage, b.depcom, b.rue, b.ville,
    b.categorie, b.ponderation_nature,
    b.coeff_entretien, b.coeff_situation_particuliere, b.coeff_situation_generale
  from public.biens b
  join public.lots l on l.id = b.lot_id
  where l.name not like '94077-%'
  order by b.lot_id, b.created_at
),
variants(nature, surface, nb_pieces, nb_wc, nb_baignoires, nb_douches, nb_bidets, nb_eviers, ascenseur, eau, gaz, elec) as (
  values
    ('Appartement', 25, 1, 1, 0, 1, 0, 1, false, true,  false, true),
    ('Appartement', 38, 2, 1, 1, 0, 0, 1, true,  true,  true,  true),
    ('Appartement', 52, 3, 1, 1, 1, 0, 1, true,  true,  true,  true),
    ('Parking',     12, 0, 0, 0, 0, 0, 0, false, false, false, false),
    ('Cave',         6, 0, 0, 0, 0, 0, 0, false, false, false, true)
),
rows as (
  select t.*, v.*, row_number() over (order by t.lot_id, v.surface) as rn
  from template t cross join variants v
)
insert into public.biens (
  org_id, lot_id, nature, invariant_cadastral, surface_m2, etage,
  nb_pieces, nb_wc, nb_baignoires, nb_douches, nb_bidets, nb_eviers,
  ascenseur, eau_courante, gaz, electricite,
  ponderation_nature, categorie, depcom, rue, ville,
  coeff_entretien, coeff_situation_particuliere, coeff_situation_generale, statut
)
select
  r.org_id, r.lot_id, r.nature,
  '9' || lpad(r.rn::text, 11, '0'),
  r.surface, r.etage,
  r.nb_pieces, r.nb_wc, r.nb_baignoires, r.nb_douches, r.nb_bidets, r.nb_eviers,
  r.ascenseur, r.eau, r.gaz, r.elec,
  r.ponderation_nature, r.categorie, r.depcom, r.rue, r.ville,
  r.coeff_entretien, r.coeff_situation_particuliere, r.coeff_situation_generale, 'importe'
from rows r
where not exists (
  select 1 from public.biens b where b.invariant_cadastral = '9' || lpad(r.rn::text, 11, '0')
);
