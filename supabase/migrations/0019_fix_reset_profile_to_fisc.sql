-- Migration: 0019_fix_reset_profile_to_fisc
-- Fix reset_profile_to_fisc: the previous version JOINed `lots` onto the UPDATE
-- target `biens b` inside the FROM clause, which Postgres rejects ("invalid
-- reference to FROM-clause entry for table b"). Move every join into WHERE so the
-- target table is only referenced from SET/WHERE.

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
  from public.biens_fisc f, public.lots l
  where b.id = f.bien_id
    and l.id = b.lot_id
    and l.fiscal_profile_id = p_profile;

  delete from public.reclamations where fiscal_profile_id = p_profile;
end;
$$;
