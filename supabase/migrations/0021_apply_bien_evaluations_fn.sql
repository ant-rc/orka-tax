-- Migration: 0021_apply_bien_evaluations_fn
-- Apply pre-computed bien evaluations (statut, has_anomaly, anomalies,
-- degrevement) in a single UPDATE instead of one round-trip per bien.
-- The client computes the evaluations (pure lib) and sends them as a JSON array
-- of { id, statut, has_anomaly, anomalies, degrevement }.

create or replace function public.apply_bien_evaluations(p_rows jsonb)
returns void
language sql
as $$
  update public.biens b set
    statut             = (e->>'statut')::public.bien_statut,
    has_anomaly        = (e->>'has_anomaly')::boolean,
    anomalies          = e->'anomalies',
    degrevement_estime = (e->>'degrevement')::numeric
  from jsonb_array_elements(p_rows) e
  where b.id = (e->>'id')::uuid;
$$;

grant execute on function public.apply_bien_evaluations(jsonb) to anon, authenticated;
