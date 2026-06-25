-- Migration: 0011_biens_fisc_snapshot
-- The biens columns hold the FISC reference. Freeze the 11 comparable fields into
-- fisc_snapshot so later corrections (manual/bulk/import) can be diffed against it.
-- anomalies holds the per-field diff after comparison.

alter table public.biens add column if not exists fisc_snapshot jsonb;
alter table public.biens add column if not exists anomalies jsonb not null default '[]'::jsonb;

-- Freeze the current (FISC) values for existing biens where not already frozen.
update public.biens set fisc_snapshot = jsonb_build_object(
  'surface_m2', surface_m2,
  'nb_pieces', nb_pieces,
  'nb_wc', nb_wc,
  'nb_baignoires', nb_baignoires,
  'nb_douches', nb_douches,
  'nb_bidets', nb_bidets,
  'nb_eviers', nb_eviers,
  'ascenseur', ascenseur,
  'eau_courante', eau_courante,
  'gaz', gaz,
  'electricite', electricite
) where fisc_snapshot is null;
