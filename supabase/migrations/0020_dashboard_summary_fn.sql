-- Migration: 0020_dashboard_summary_fn
-- Single round-trip aggregate for the dashboard: lots count, biens count, how
-- many biens are still untreated ("importe"), and the total estimated
-- dégrèvement for a fiscal profile. Replaces 3 separate client queries.

create or replace function public.dashboard_summary(p_profile uuid)
returns table(lots integer, biens integer, untreated integer, degrevement numeric)
language sql
stable
as $$
  select
    (select count(*)::int from public.lots l where l.fiscal_profile_id = p_profile) as lots,
    count(b.*)::int as biens,
    count(*) filter (where b.statut = 'importe')::int as untreated,
    coalesce(round(sum(b.degrevement_estime)::numeric, 2), 0) as degrevement
  from public.biens b
  join public.lots l on l.id = b.lot_id
  where l.fiscal_profile_id = p_profile;
$$;

grant execute on function public.dashboard_summary(uuid) to anon, authenticated;
