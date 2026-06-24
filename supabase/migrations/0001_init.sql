-- Migration: 0001_init
-- Schema initial pour KADASTRA MVP

-- ============================================================
-- EXTENSIONS
-- ============================================================

-- ============================================================
-- TABLE: organizations
-- ============================================================
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.organizations enable row level security;

create policy "members read/write own org" on public.organizations
  for all using (
    id in (select org_id from public.memberships where user_id = auth.uid())
  )
  with check (
    id in (select org_id from public.memberships where user_id = auth.uid())
  );

-- ============================================================
-- TABLE: profiles
-- ============================================================
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  default_org_id  uuid references public.organizations(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "user read/write own profile" on public.profiles
  for all using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- TABLE: memberships
-- ============================================================
create type public.membership_role as enum ('owner', 'admin', 'member');

create table public.memberships (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        public.membership_role not null default 'member',
  created_at  timestamptz not null default now(),
  unique (org_id, user_id)
);

alter table public.memberships enable row level security;

create policy "members read/write own org" on public.memberships
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- TABLE: lots
-- ============================================================
create table public.lots (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.lots enable row level security;

create policy "members read/write own org" on public.lots
  for all using (
    org_id in (select org_id from public.memberships where user_id = auth.uid())
  )
  with check (
    org_id in (select org_id from public.memberships where user_id = auth.uid())
  );

-- ============================================================
-- TABLE: import_batches
-- ============================================================
create type public.import_status as enum ('pending', 'processing', 'done', 'error');

create table public.import_batches (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  lot_id        uuid references public.lots(id) on delete set null,
  filename      text not null,
  status        public.import_status not null default 'pending',
  row_count     integer,
  error_message text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.import_batches enable row level security;

create policy "members read/write own org" on public.import_batches
  for all using (
    org_id in (select org_id from public.memberships where user_id = auth.uid())
  )
  with check (
    org_id in (select org_id from public.memberships where user_id = auth.uid())
  );

-- ============================================================
-- TABLE: column_mappings
-- ============================================================
create table public.column_mappings (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  batch_id        uuid references public.import_batches(id) on delete cascade,
  source_column   text not null,
  canonical_key   text not null,
  created_at      timestamptz not null default now()
);

alter table public.column_mappings enable row level security;

create policy "members read/write own org" on public.column_mappings
  for all using (
    org_id in (select org_id from public.memberships where user_id = auth.uid())
  )
  with check (
    org_id in (select org_id from public.memberships where user_id = auth.uid())
  );

-- ============================================================
-- TABLE: biens
-- Columns match CANONICAL_FIELDS keys exactly, plus computed/status cols
-- ============================================================
create type public.bien_status as enum ('draft', 'validated', 'archived');

create table public.biens (
  id                            uuid primary key default gen_random_uuid(),
  org_id                        uuid not null references public.organizations(id) on delete cascade,
  lot_id                        uuid not null references public.lots(id) on delete cascade,
  batch_id                      uuid references public.import_batches(id) on delete set null,

  -- CANONICAL_FIELDS keys (verbatim)
  invariant_cadastral           text,
  rue                           text,
  depcom                        text,
  ville                         text,
  nom_immeuble                  text,
  nature                        text,
  ponderation_nature            numeric,
  etage                         text,
  categorie                     text,
  surface_m2                    numeric,
  coeff_entretien               numeric,
  coeff_situation_particuliere  numeric,
  coeff_situation_generale      numeric,
  ascenseur                     boolean,
  eau_courante                  boolean,
  gaz                           boolean,
  electricite                   boolean,
  nb_baignoires                 integer,
  nb_douches                    integer,
  nb_bidets                     integer,
  nb_wc                         integer,
  nb_eviers                     integer,
  egout                         boolean,
  nb_pieces                     integer,
  nb_vide_ordures               integer,

  -- Additional computed / status columns
  status                        public.bien_status not null default 'draft',
  completeness                  numeric,
  degrevement_estime            numeric,
  estimation_params             jsonb,
  estimation_computed_at        timestamptz,

  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

alter table public.biens enable row level security;

create policy "members read/write own org" on public.biens
  for all using (
    org_id in (select org_id from public.memberships where user_id = auth.uid())
  )
  with check (
    org_id in (select org_id from public.memberships where user_id = auth.uid())
  );

-- ============================================================
-- TRIGGER: handle_new_user
-- On auth.users insert: create profile + organization + owner membership
-- and set profiles.default_org_id
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_org_id uuid;
begin
  -- Create a default organization named after the user's email
  insert into public.organizations (name)
  values (coalesce(new.raw_user_meta_data->>'organization_name', split_part(new.email, '@', 1)))
  returning id into new_org_id;

  -- Create a profile for the new user
  insert into public.profiles (id, full_name, default_org_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new_org_id
  );

  -- Create an owner membership linking the user to the new organization
  insert into public.memberships (org_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
