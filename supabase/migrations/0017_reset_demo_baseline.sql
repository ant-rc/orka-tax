-- Migration: 0017_reset_demo_baseline
-- Reset every bien to its FISC reference and the "importe" state so the demo
-- starts clean and conforme (no anomaly until a user edits a bien). Idempotent.

update public.biens b set
  surface_m2         = f.surface_m2,
  nb_pieces          = f.nb_pieces,
  nb_wc              = f.nb_wc,
  nb_baignoires      = f.nb_baignoires,
  nb_douches         = f.nb_douches,
  nb_bidets          = f.nb_bidets,
  nb_eviers          = f.nb_eviers,
  ascenseur          = f.ascenseur,
  eau_courante       = f.eau_courante,
  gaz                = f.gaz,
  electricite        = f.electricite,
  statut             = 'importe',
  has_anomaly        = false,
  anomalies          = '[]'::jsonb,
  degrevement_estime = 0
from public.biens_fisc f
where b.id = f.bien_id;

delete from public.reclamations;
