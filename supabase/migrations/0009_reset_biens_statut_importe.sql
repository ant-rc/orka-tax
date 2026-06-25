-- Migration: 0009_reset_biens_statut_importe
-- All demo biens represent freshly-imported data (the qualification tunnel has not
-- run yet), so every bien starts at the default tunnel stage "importe". This resets
-- the artificially-spread statuses from earlier seeds. New imports already default to
-- 'importe' (biens.statut column default, migration 0005), so this only normalizes
-- existing rows.

update public.biens set statut = 'importe' where statut <> 'importe';
