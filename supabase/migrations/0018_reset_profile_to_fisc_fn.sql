-- Migration: 0018_reset_profile_to_fisc_fn
-- Demo helper: reset every bien of a fiscal profile back to its FISC reference
-- (original imported values) and the "importe" state, and clear its réclamations.
-- Lets the "Réinitialiser les valeurs" button replay the demo from scratch.

create or replace function public.reset_profile_to_fisc(p_profile uuid)
returns void
language plpgsql
as $$
begin
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
  join public.lots l on l.id = b.lot_id
  where b.id = f.bien_id and l.fiscal_profile_id = p_profile;

  delete from public.reclamations where fiscal_profile_id = p_profile;
end;
$$;

-- Demo: callable from the (still unauthenticated) anon client.
grant execute on function public.reset_profile_to_fisc(uuid) to anon, authenticated;
