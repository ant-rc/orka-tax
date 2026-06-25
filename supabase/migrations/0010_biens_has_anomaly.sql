-- Migration: 0010_biens_has_anomaly
-- Add a discrepancy flag used by the "Générer mon rapport" simulation: flagged biens
-- become `anomalie` (and surface on the anomalies screen), others become `resolu`.
-- No real FISC feed yet, so we seed the discrepancy on a batch of the 94077-VOLTA lot
-- with deliberately altered room values. Idempotent (absolute values, fixed order).

alter table public.biens add column if not exists has_anomaly boolean not null default false;

update public.biens
set has_anomaly = true, nb_douches = 2, nb_baignoires = 1, nb_pieces = 4
where id in (
  select id
  from public.biens
  where lot_id = '11111111-0000-0000-0000-000000940770'
  order by invariant_cadastral
  limit 12
);
