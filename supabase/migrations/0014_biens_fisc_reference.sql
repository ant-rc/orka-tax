-- Migration: 0014_biens_fisc_reference
-- Dedicated FISC reference for the 11 changeable fields, frozen at import time.
-- `biens` holds the working values (editable); `biens_fisc` keeps the original
-- imported values so we can diff changes and reset biens to their import state.
-- Supersedes the jsonb `biens.fisc_snapshot` (kept, deprecated, dropped later).

create table if not exists public.biens_fisc (
  bien_id        uuid primary key references public.biens(id) on delete cascade,
  surface_m2     numeric,
  nb_pieces      integer,
  nb_wc          integer,
  nb_baignoires  integer,
  nb_douches     integer,
  nb_bidets      integer,
  nb_eviers      integer,
  ascenseur      boolean,
  eau_courante   boolean,
  gaz            boolean,
  electricite    boolean,
  created_at     timestamptz not null default now()
);

alter table public.biens_fisc enable row level security;
drop policy if exists "demo public read"  on public.biens_fisc;
drop policy if exists "demo public write" on public.biens_fisc;
create policy "demo public read"  on public.biens_fisc for select using (true);
create policy "demo public write" on public.biens_fisc for all using (true) with check (true);

-- Freeze the FISC reference automatically for every bien inserted (import/manual),
-- so all current and future creation paths populate biens_fisc without app code.
create or replace function public.snapshot_bien_fisc()
returns trigger
language plpgsql
as $$
begin
  insert into public.biens_fisc (
    bien_id, surface_m2, nb_pieces, nb_wc, nb_baignoires, nb_douches,
    nb_bidets, nb_eviers, ascenseur, eau_courante, gaz, electricite
  ) values (
    new.id, new.surface_m2, new.nb_pieces, new.nb_wc, new.nb_baignoires, new.nb_douches,
    new.nb_bidets, new.nb_eviers, new.ascenseur, new.eau_courante, new.gaz, new.electricite
  )
  on conflict (bien_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_snapshot_bien_fisc on public.biens;
create trigger trg_snapshot_bien_fisc
after insert on public.biens
for each row execute function public.snapshot_bien_fisc();

-- Backfill the FISC reference for existing biens from the original jsonb snapshot.
insert into public.biens_fisc (
  bien_id, surface_m2, nb_pieces, nb_wc, nb_baignoires, nb_douches,
  nb_bidets, nb_eviers, ascenseur, eau_courante, gaz, electricite
)
select
  id,
  (fisc_snapshot->>'surface_m2')::numeric,
  (fisc_snapshot->>'nb_pieces')::int,
  (fisc_snapshot->>'nb_wc')::int,
  (fisc_snapshot->>'nb_baignoires')::int,
  (fisc_snapshot->>'nb_douches')::int,
  (fisc_snapshot->>'nb_bidets')::int,
  (fisc_snapshot->>'nb_eviers')::int,
  (fisc_snapshot->>'ascenseur')::boolean,
  (fisc_snapshot->>'eau_courante')::boolean,
  (fisc_snapshot->>'gaz')::boolean,
  (fisc_snapshot->>'electricite')::boolean
from public.biens
where fisc_snapshot is not null
on conflict (bien_id) do nothing;

-- Reset working values back to the FISC reference and clear the tunnel state.
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

-- A fresh import baseline has no reclamations.
delete from public.reclamations;
