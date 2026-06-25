# Fiscal Profiles Switch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "fiscal profile" layer (one numéro fiscal = one tax zone) under each account, with a header switcher that scopes the lots / biens / "Votre déclaration" to the selected profile.

**Architecture:** New `fiscal_profiles` table sits between `organizations` (the account/login) and `lots`. Each `lot` gains a `fiscal_profile_id`. A React `FiscalProfileProvider` loads the account's profiles and holds the active one (persisted in `localStorage`); a header `ProfileSwitcher` changes it; data components re-fetch when it changes. Demo data is reseeded so each profile's lots all live in one commune (`depcom`).

**Tech Stack:** Next.js 16 App Router (client components), TypeScript strict, Supabase (Postgres + RLS, CLI migrations), Tailwind v4, lucide-react, Vitest, Playwright MCP for visual checks.

## Global Constraints

- Réponses en français ; code, commits, identifiants en anglais.
- Aucune référence à Claude / IA dans le code, commits, commentaires.
- Conventional commits : `type(scope): subject` (scopes utiles : `dashboard`, `auth`, `layout`, `api`). Pas de `Co-Authored-By`.
- TypeScript strict : zéro `any`, zéro import/variable inutilisé, `const` par défaut.
- Demo single-tenant relâché : policies `demo public read` / `demo public write` (à retirer avec l'auth réelle).
- Branche dédiée puis merge fast-forward sur `main` ; ne jamais merger/force-push sans demande (déjà acquis pour cette feature).
- Toujours vérifier `tsc` + `next build` après modifications ; vérifier le runtime via Playwright.
- Account = `organizations` (login par `company_id`). Fiscal profile = `fiscal_profiles` (à NE PAS confondre avec la table `profiles` = profils utilisateurs `auth.users`).
- Démo validée : **2 comptes** (Cabinet Démo Patrimoine `552 081 317`, Foncière Atlantique `843 119 204`), chacun **2-3 profils fiscaux** ; zone au grain **commune (`depcom` INSEE)** ; numéro fiscal réaliste + libellé de zone ; droits par profil **préparés mais pas filtrés** maintenant.
- IDs démo existants : org A = `aaaaaaaa-0000-0000-0000-000000000001`, org B = `aaaaaaaa-0000-0000-0000-000000000002`.

---

## File Structure

**Created:**
- `supabase/migrations/0007_fiscal_profiles.sql` — table, FK, zone-coherent reseed, demo RLS.
- `lib/fiscal/active-profile.ts` — pure resolver for the active profile id.
- `lib/fiscal/active-profile.test.ts` — Vitest unit tests.
- `components/dashboard/fiscal-profile-context.tsx` — provider + `useFiscalProfile` hook.
- `components/dashboard/profile-switcher.tsx` — header dropdown.

**Modified:**
- `lib/domain/property.ts` — add `FiscalProfile` type.
- `lib/supabase/client.ts` — `getActiveFiscalProfileId` / `setActiveFiscalProfileId`.
- `lib/supabase/queries.ts` — `fetchFiscalProfiles`, scope `fetchLots` / `createLot` / declaration counts by `fiscal_profile_id`.
- `lib/supabase/types.ts` — regenerated.
- `components/dashboard/header.tsx` — mount `ProfileSwitcher`.
- `app/(app)/layout.tsx` — wrap with `FiscalProfileProvider`.
- `components/dashboard/lots-panel.tsx` — scope to active profile, reset state on switch.
- `components/dashboard/declaration-card.tsx` — show numéro fiscal + commune, counts per profile.
- `app/page.tsx` — on login, set the account's default fiscal profile.

**Unchanged (note):** `biens-panel.tsx` stays scoped by `lotId` (a lot already belongs to a profile), so no profile context needed there.

---

### Task 1: Migration 0007 — fiscal_profiles schema + zone-coherent reseed

**Files:**
- Create: `supabase/migrations/0007_fiscal_profiles.sql`
- Modify (regenerate): `lib/supabase/types.ts`

**Interfaces:**
- Produces (DB): table `public.fiscal_profiles(id uuid, org_id uuid, numero_fiscal text, label text, depcom text, commune text, created_at timestamptz)`; column `public.lots.fiscal_profile_id uuid` (FK → fiscal_profiles, on delete cascade). Demo profile ids: `f1111111-…-0001/0002/0003` (org A), `f2222222-…-0001/0002` (org B).

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0007_fiscal_profiles.sql`:

```sql
-- Migration: 0007_fiscal_profiles
-- DEMO ONLY — introduce a fiscal-profile layer (one numéro fiscal = one commune)
-- between organizations (the account) and lots. Reseed both demo accounts so each
-- profile's lots all live in a single commune (depcom). Idempotent / additive.

-- ============================================================
-- TABLE: fiscal_profiles  (NB: distinct from auth `profiles`)
-- ============================================================
create table if not exists public.fiscal_profiles (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  numero_fiscal text not null,
  label         text not null,
  depcom        text,
  commune       text,
  created_at    timestamptz not null default now()
);

alter table public.fiscal_profiles enable row level security;

drop policy if exists "demo public read"  on public.fiscal_profiles;
drop policy if exists "demo public write" on public.fiscal_profiles;
create policy "demo public read"  on public.fiscal_profiles for select using (true);
create policy "demo public write" on public.fiscal_profiles for all using (true) with check (true);

-- lots get scoped to a fiscal profile
alter table public.lots add column if not exists fiscal_profile_id uuid
  references public.fiscal_profiles(id) on delete cascade;

-- ============================================================
-- Clean reseed of both demo accounts (zone coherence)
-- ============================================================
delete from public.biens
  where org_id in ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');
delete from public.lots
  where org_id in ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');
delete from public.fiscal_profiles
  where org_id in ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');

-- Fiscal profiles: org A (3 communes), org B (2 communes)
insert into public.fiscal_profiles (id, org_id, numero_fiscal, label, depcom, commune) values
  ('f1111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '75 111 0012 345', 'Paris 11e',    '75111', 'PARIS'),
  ('f1111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '69 383 0008 210', 'Lyon 3e',      '69383', 'LYON'),
  ('f1111111-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', '13 206 0021 044', 'Marseille 6e', '13206', 'MARSEILLE'),
  ('f2222222-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', '17 300 0005 118', 'La Rochelle',  '17300', 'LA ROCHELLE'),
  ('f2222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', '64 122 0003 902', 'Biarritz',     '64122', 'BIARRITZ');

-- Lots per profile — all addresses within the profile's commune.
-- Each INSERT uses its own street set so the data stays realistic per zone.
insert into public.lots (org_id, fiscal_profile_id, name, address, city)
select fp.org_id, fp.id, fp.depcom || '-' || s.slug, s.street, fp.commune
from public.fiscal_profiles fp
join (values
  ('75111', 'OBERKAMPF',  '34 RUE OBERKAMPF'),
  ('75111', 'PARMENTIER', '12 AVENUE PARMENTIER'),
  ('75111', 'ROQUETTE',   '8 RUE DE LA ROQUETTE'),
  ('75111', 'VOLTAIRE',   '50 BOULEVARD VOLTAIRE'),
  ('75111', 'CHARONNE',   '21 RUE DE CHARONNE'),
  ('75111', 'NATION',     '3 PLACE DE LA NATION'),
  ('69383', 'LAFAYETTE',  '8 COURS LAFAYETTE'),
  ('69383', 'PART-DIEU',  '17 RUE GARIBALDI'),
  ('69383', 'MANUFACTURE','5 RUE DE LA MANUFACTURE'),
  ('69383', 'SAXE',       '40 AVENUE MARECHAL DE SAXE'),
  ('69383', 'PAUL-BERT',  '22 RUE PAUL BERT'),
  ('13206', 'PRADO',      '120 AVENUE DU PRADO'),
  ('13206', 'CASTELLANE', '9 PLACE CASTELLANE'),
  ('13206', 'PERIER',     '56 BOULEVARD PERIER'),
  ('13206', 'BAILLE',     '14 BOULEVARD BAILLE'),
  ('13206', 'LODI',       '3 RUE DE LODI'),
  ('17300', 'VIEUX-PORT', '5 QUAI DULUC'),
  ('17300', 'GABUT',      '11 RUE DU GABUT'),
  ('17300', 'VERDIERE',   '7 RUE DE LA VERDIERE'),
  ('17300', 'CHAINE',     '2 RUE DE LA CHAINE'),
  ('64122', 'GRANDE-PLAGE','8 AVENUE EDOUARD VII'),
  ('64122', 'PORT-VIEUX', '3 RUE DU PORT VIEUX'),
  ('64122', 'GAMBETTA',   '25 AVENUE GAMBETTA'),
  ('64122', 'HALLES',     '6 RUE DES HALLES')
) as s(depcom, slug, street) on s.depcom = fp.depcom;

-- Biens — 3 per lot, depcom/ville derived from the profile, statut spread.
insert into public.biens
  (org_id, lot_id, invariant_cadastral, rue, depcom, ville, nature, etage, surface_m2, statut)
select
  l.org_id, l.id,
  to_char(g, 'FM000') || replace(l.id::text, '-', ''),
  l.address, fp.depcom, fp.commune,
  (array['Appartement', 'Cave', 'Parking'])[((g - 1) % 3) + 1],
  ((g - 1) % 5)::text,
  (array[28, 12, 42, 6, 65])[((g - 1) % 5) + 1],
  (array[
    'importe', 'rapprochement', 'resolu', 'analyse',
    'anomalie', 'reclamation', 'remboursement'
  ]::public.bien_statut[])[((g - 1) % 7) + 1]
from public.lots l
join public.fiscal_profiles fp on fp.id = l.fiscal_profile_id
cross join generate_series(1, 3) as g
where l.org_id in ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002');
```

- [ ] **Step 2: Apply the migration**

Run: `supabase db push`
Expected: `Applying migration 0007_fiscal_profiles.sql...` then `Finished supabase db push.`

- [ ] **Step 3: Regenerate types**

Run: `supabase gen types typescript --linked > lib/supabase/types.ts`
Expected: file updated; `fiscal_profiles` table and `lots.fiscal_profile_id` present.

- [ ] **Step 4: Verify zone coherence via REST**

Run (replace `$URL`/`$KEY` from `.env.local`):
```bash
URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2- | tr -d '"\r')
KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2- | tr -d '"\r')
# profiles per org
curl -s "$URL/rest/v1/fiscal_profiles?select=org_id,numero_fiscal,commune" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
# lots of the Paris profile must all be PARIS
curl -s "$URL/rest/v1/lots?fiscal_profile_id=eq.f1111111-0000-0000-0000-000000000001&select=name,city" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```
Expected: 5 profiles (3 org A + 2 org B); every Paris-profile lot has `"city":"PARIS"`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0007_fiscal_profiles.sql lib/supabase/types.ts
git commit -m 'feat(api): add fiscal_profiles layer with zone-coherent demo seed'
```

---

### Task 2: Domain type + active-profile resolver (TDD)

**Files:**
- Modify: `lib/domain/property.ts`
- Create: `lib/fiscal/active-profile.ts`
- Test: `lib/fiscal/active-profile.test.ts`

**Interfaces:**
- Produces: `interface FiscalProfile { id: string; numeroFiscal: string; label: string; depcom: string; commune: string }`
- Produces: `resolveActiveProfileId(storedId: string | null, profileIds: string[]): string | null` — returns `storedId` if present in `profileIds`, else the first id, else `null`.

- [ ] **Step 1: Write the failing test**

Create `lib/fiscal/active-profile.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveActiveProfileId } from './active-profile';

describe('resolveActiveProfileId', () => {
  it('keeps the stored id when it belongs to the account', () => {
    expect(resolveActiveProfileId('b', ['a', 'b', 'c'])).toBe('b');
  });

  it('falls back to the first id when the stored id is unknown', () => {
    expect(resolveActiveProfileId('z', ['a', 'b'])).toBe('a');
  });

  it('falls back to the first id when nothing is stored', () => {
    expect(resolveActiveProfileId(null, ['a', 'b'])).toBe('a');
  });

  it('returns null when there are no profiles', () => {
    expect(resolveActiveProfileId('a', [])).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/fiscal/active-profile.test.ts`
Expected: FAIL — cannot resolve `./active-profile`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/fiscal/active-profile.ts`:

```ts
/** Pick the active fiscal profile: the stored one if still valid, else the first. */
export function resolveActiveProfileId(
  storedId: string | null,
  profileIds: string[],
): string | null {
  if (storedId && profileIds.includes(storedId)) return storedId;
  return profileIds[0] ?? null;
}
```

- [ ] **Step 4: Add the FiscalProfile type**

In `lib/domain/property.ts`, append:

```ts
export interface FiscalProfile {
  id: string;
  numeroFiscal: string;
  label: string;
  depcom: string;
  commune: string;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/fiscal/active-profile.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/fiscal/active-profile.ts lib/fiscal/active-profile.test.ts lib/domain/property.ts
git commit -m 'feat(dashboard): add FiscalProfile type and active-profile resolver'
```

---

### Task 3: Client helpers + queries scoped by fiscal profile

**Files:**
- Modify: `lib/supabase/client.ts`
- Modify: `lib/supabase/queries.ts`

**Interfaces:**
- Consumes: `FiscalProfile` (Task 2), `createClient`, `DEMO_ORG_ID`.
- Produces: `getActiveFiscalProfileId(): string | null`, `setActiveFiscalProfileId(id: string): void` (localStorage key `orka_fiscal_profile`).
- Produces: `fetchFiscalProfiles(orgId: string): Promise<FiscalProfile[]>`; `fetchLots(fiscalProfileId: string): Promise<Lot[]>` (now scoped by profile, **signature change**); `createLot(orgId: string, fiscalProfileId: string, input: { name: string; address: string }): Promise<Lot>` (**signature change**); `fetchDeclarationCounts(fiscalProfileId: string): Promise<{ lots: number; biens: number }>`.

- [ ] **Step 1: Add the localStorage helpers**

In `lib/supabase/client.ts`, after `getActiveOrgId`, add:

```ts
const FISCAL_PROFILE_KEY = 'orka_fiscal_profile';

/** Active fiscal profile id (client-side only). */
export function getActiveFiscalProfileId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(FISCAL_PROFILE_KEY);
  } catch {
    return null;
  }
}

export function setActiveFiscalProfileId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FISCAL_PROFILE_KEY, id);
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
}
```

- [ ] **Step 2: Add fetchFiscalProfiles + mapper to queries**

In `lib/supabase/queries.ts`, add the import and function. Update the property import line to include `FiscalProfile`:

```ts
import {
  type Lot,
  type Bien,
  type BienType,
  type BienStatut,
  type FiscalProfile,
  BIEN_TYPES,
} from '@/lib/domain/property';
```

Add near the other mappers:

```ts
type FiscalProfileRow = Database['public']['Tables']['fiscal_profiles']['Row'];

function mapFiscalProfile(
  row: Pick<FiscalProfileRow, 'id' | 'numero_fiscal' | 'label' | 'depcom' | 'commune'>,
): FiscalProfile {
  return {
    id: row.id,
    numeroFiscal: row.numero_fiscal,
    label: row.label,
    depcom: row.depcom ?? '',
    commune: row.commune ?? '',
  };
}

export async function fetchFiscalProfiles(orgId: string): Promise<FiscalProfile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('fiscal_profiles')
    .select('id, numero_fiscal, label, depcom, commune')
    .eq('org_id', orgId)
    .order('label');
  if (error) throw error;
  return (data ?? []).map(mapFiscalProfile);
}
```

- [ ] **Step 3: Scope fetchLots and createLot to the fiscal profile**

In `lib/supabase/queries.ts`, replace the existing `fetchLots` and `createLot`:

```ts
export async function fetchLots(fiscalProfileId: string): Promise<Lot[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('lots')
    .select('id, name, address, city')
    .eq('fiscal_profile_id', fiscalProfileId)
    .order('name');
  if (error) throw error;
  return (data ?? []).map(mapLot);
}

export async function createLot(
  orgId: string,
  fiscalProfileId: string,
  input: { name: string; address: string },
): Promise<Lot> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('lots')
    .insert({
      org_id: orgId,
      fiscal_profile_id: fiscalProfileId,
      name: input.name,
      address: input.address,
      city: '',
    })
    .select('id, name, address, city')
    .single();
  if (error) throw error;
  return mapLot(data);
}
```

- [ ] **Step 4: Add fetchDeclarationCounts scoped to the profile**

In `lib/supabase/queries.ts`, add:

```ts
export async function fetchDeclarationCounts(
  fiscalProfileId: string,
): Promise<{ lots: number; biens: number }> {
  const supabase = createClient();
  const [lotsRes, biensRes] = await Promise.all([
    supabase.from('lots').select('*', { count: 'exact', head: true })
      .eq('fiscal_profile_id', fiscalProfileId),
    supabase.from('biens').select('lot_id, lots!inner(fiscal_profile_id)', { count: 'exact', head: true })
      .eq('lots.fiscal_profile_id', fiscalProfileId),
  ]);
  return { lots: lotsRes.count ?? 0, biens: biensRes.count ?? 0 };
}
```

- [ ] **Step 5: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: errors ONLY in the not-yet-updated callers (`lots-panel.tsx`, `declaration-card.tsx`). If `queries.ts`/`client.ts` themselves error, fix before continuing.

- [ ] **Step 6: Commit**

```bash
git add lib/supabase/client.ts lib/supabase/queries.ts
git commit -m 'feat(api): scope lots and declaration counts by fiscal profile'
```

---

### Task 4: FiscalProfileProvider context

**Files:**
- Create: `components/dashboard/fiscal-profile-context.tsx`
- Modify: `app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `fetchFiscalProfiles`, `getActiveFiscalProfileId`, `setActiveFiscalProfileId`, `getActiveOrgId`, `resolveActiveProfileId`, `FiscalProfile`.
- Produces: `useFiscalProfile(): { profiles: FiscalProfile[]; activeProfileId: string | null; activeProfile: FiscalProfile | null; setActiveProfile: (id: string) => void; loading: boolean }` and `<FiscalProfileProvider>`.

- [ ] **Step 1: Create the provider**

Create `components/dashboard/fiscal-profile-context.tsx`:

```tsx
'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { FiscalProfile } from '@/lib/domain/property';
import { fetchFiscalProfiles } from '@/lib/supabase/queries';
import {
  getActiveOrgId,
  getActiveFiscalProfileId,
  setActiveFiscalProfileId,
} from '@/lib/supabase/client';
import { resolveActiveProfileId } from '@/lib/fiscal/active-profile';

interface FiscalProfileContextValue {
  profiles: FiscalProfile[];
  activeProfileId: string | null;
  activeProfile: FiscalProfile | null;
  setActiveProfile: (id: string) => void;
  loading: boolean;
}

const FiscalProfileContext = createContext<FiscalProfileContextValue | null>(null);

export function FiscalProfileProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [profiles, setProfiles] = useState<FiscalProfile[]>([]);
  const [activeProfileId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchFiscalProfiles(getActiveOrgId())
      .then((rows) => {
        if (!active) return;
        setProfiles(rows);
        const resolved = resolveActiveProfileId(getActiveFiscalProfileId(), rows.map((p) => p.id));
        setActiveId(resolved);
        if (resolved) setActiveFiscalProfileId(resolved);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const setActiveProfile = useCallback((id: string) => {
    setActiveFiscalProfileId(id);
    setActiveId(id);
  }, []);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  );

  const value = useMemo(
    () => ({ profiles, activeProfileId, activeProfile, setActiveProfile, loading }),
    [profiles, activeProfileId, activeProfile, setActiveProfile, loading],
  );

  return <FiscalProfileContext.Provider value={value}>{children}</FiscalProfileContext.Provider>;
}

export function useFiscalProfile(): FiscalProfileContextValue {
  const ctx = useContext(FiscalProfileContext);
  if (!ctx) {
    return { profiles: [], activeProfileId: null, activeProfile: null, setActiveProfile: () => {}, loading: false };
  }
  return ctx;
}
```

- [ ] **Step 2: Wrap the app layout**

In `app/(app)/layout.tsx`, add the import and wrap inside `SelectionProvider`:

```tsx
import { FiscalProfileProvider } from '@/components/dashboard/fiscal-profile-context';
```

Wrap the existing tree so the provider is between `SelectionProvider` and the `div`:

```tsx
  return (
    <SelectionProvider>
      <FiscalProfileProvider>
        <div className="flex h-screen overflow-hidden bg-ui-bg-elevated">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <Header />
            <Stepper />
            <main className="flex-1 overflow-y-auto">{children}</main>
            <BottomBar />
          </div>
        </div>
      </FiscalProfileProvider>
    </SelectionProvider>
  );
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: ONLY the known `createLot` arity error in `lots-panel.tsx` (fixed in Task 5). The provider + layout must not add any new error.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/fiscal-profile-context.tsx "app/(app)/layout.tsx"
git commit -m 'feat(layout): add FiscalProfileProvider context'
```

---

### Task 5: Scope lots-panel + declaration-card to the active profile

**Files:**
- Modify: `components/dashboard/lots-panel.tsx`
- Modify: `components/dashboard/declaration-card.tsx`

**Interfaces:**
- Consumes: `useFiscalProfile` (Task 4), `fetchLots(fiscalProfileId)`, `createLot(orgId, fiscalProfileId, input)`, `fetchDeclarationCounts(fiscalProfileId)` (Task 3).

- [ ] **Step 1: Scope lots-panel data to the active profile**

In `components/dashboard/lots-panel.tsx`, add the import:

```tsx
import { useFiscalProfile } from '@/components/dashboard/fiscal-profile-context';
```

Read the active profile near the other hooks:

```tsx
  const { activeProfileId } = useFiscalProfile();
```

Replace the load effect so it depends on `activeProfileId` and resets view state on switch:

```tsx
  // Load the portfolio for the active fiscal profile; reset view on switch.
  useEffect(() => {
    if (!activeProfileId) { setLots([]); setLoading(false); return; }
    let active = true;
    setLoading(true);
    setPage(1);
    setFilters([]);
    setSelected(new Set());
    fetchLots(activeProfileId)
      .then((rows) => { if (active) setLots(rows); })
      .catch(() => { if (active) toast('Impossible de charger les lots', 'error'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeProfileId, toast]);
```

Update `handleCreate` to pass the profile id:

```tsx
  const handleCreate = useCallback(async () => {
    if (!newName.trim() || !activeProfileId) return;
    try {
      const lot = await createLot(getActiveOrgId(), activeProfileId, {
        name: newName.trim(),
        address: newRef.trim().toUpperCase(),
      });
      setLots((prev) => [lot, ...prev]);
      setCreateOpen(false);
      setNewName('');
      setNewRef('');
      toast('Lot créé', 'success');
    } catch {
      toast('Échec de la création du lot', 'error');
    }
  }, [newName, newRef, activeProfileId, toast]);
```

- [ ] **Step 2: Show the fiscal profile in the declaration card**

Replace `components/dashboard/declaration-card.tsx` with a profile-aware version:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Hash, Home, MapPin } from 'lucide-react';
import { useFiscalProfile } from '@/components/dashboard/fiscal-profile-context';
import { fetchDeclarationCounts } from '@/lib/supabase/queries';

export default function DeclarationCard() {
  const { activeProfile } = useFiscalProfile();
  const [counts, setCounts] = useState<{ lots: number; biens: number } | null>(null);

  useEffect(() => {
    if (!activeProfile) { setCounts(null); return; }
    let active = true;
    setCounts(null);
    fetchDeclarationCounts(activeProfile.id)
      .then((c) => { if (active) setCounts(c); })
      .catch(() => { if (active) setCounts({ lots: 0, biens: 0 }); });
    return () => { active = false; };
  }, [activeProfile]);

  return (
    <div className="bg-white rounded-lg border border-ui-border p-5">
      <div className="flex items-center gap-3 mb-4">
        <img src="/assets/lots.webp" alt="" className="size-10" />
        <h2 className="text-lg font-semibold text-ui-text-highlighted">Votre déclaration</h2>
      </div>
      <div className="border-t border-ui-border pt-4 flex flex-col gap-3 text-sm text-ui-text-muted">
        <div className="flex items-center gap-3">
          <Hash size={16} className="text-ui-text-muted shrink-0" />
          <span>{activeProfile ? `N° ${activeProfile.numeroFiscal}` : '…'}</span>
        </div>
        <div className="flex items-center gap-3">
          <MapPin size={16} className="text-ui-text-muted shrink-0" />
          <span className="truncate" title={activeProfile?.commune ?? undefined}>
            {activeProfile ? `${activeProfile.label} · ${activeProfile.commune}` : '…'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Home size={16} className="text-ui-text-muted shrink-0" />
          <span>{counts ? `${counts.lots} lots` : '… lots'}</span>
        </div>
        <div className="flex items-center gap-3">
          <Home size={16} className="text-ui-text-muted shrink-0" />
          <span>{counts ? `${counts.biens} biens` : '… biens'}</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify type-check and build**

Run: `npx tsc --noEmit && npx next build`
Expected: no errors; `Compiled successfully`.

- [ ] **Step 4: Runtime check with Playwright (default profile)**

Start dev server (`npx next dev -p 3137`), navigate to `http://localhost:3137/dashboard`, then read:
- the lots table city column — every visible row must be the SAME commune (the default profile's zone);
- the declaration card — numéro fiscal + `label · commune` + non-zero lots/biens counts.

Expected: the dashboard is scoped to a single commune (no cross-zone leakage). The switcher UI itself is added in Task 6. Stop the dev server afterward.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/lots-panel.tsx components/dashboard/declaration-card.tsx
git commit -m 'feat(dashboard): scope lots and declaration to the active fiscal profile'
```

---

### Task 6: ProfileSwitcher in the header (Figma 277:4160 / 277:3976 / placement 175:7075)

**Files:**
- Create: `components/dashboard/profile-switcher.tsx`
- Modify: `components/dashboard/header.tsx`
- Possibly modify: `app/globals.css` (add `vert-50` / `vert-500` theme tokens if missing)

**Design (from Figma — apply these behaviour changes vs the original plan):**
- Trigger button: `w-[225px] h-10`, white bg (→ `vert-50` background when open), `border` slate-400-ish (use `border-ui-border-accented`), `rounded-lg`, `pl-1.5 pr-2 py-2`, `justify-between`.
- Trigger content: 28px rounded icon (`/assets/lots.webp` in a `size-7 rounded-lg` box) + `n°{numeroFiscal}` text in `text-xs font-medium text-vert-900` + chevron (down closed / up open).
- Dropdown: below the trigger, `w-[225px] rounded-xl bg-white p-2 gap-[7px] shadow-md`. Each item = icon + `n°{numeroFiscal}` on the left, a **radio** on the right. Selected item has a **green border** (`border-vert-500`) and a **filled radio** (`bg-vert-900` circle with a white check); unselected items have an empty radio (`border-ui-border-accented` circle).
- **Label shown is the numéro fiscal, not the commune** (commune kept in the `title` for hover).

**Interfaces:**
- Consumes: `useFiscalProfile` (Task 4).
- Produces: default-exported `<ProfileSwitcher />`.

- [ ] **Step 1: Ensure the green theme tokens exist**

Check `app/globals.css` `@theme` for `--color-vert-50` and `--color-vert-500`. If either is missing, add it (Figma values): `--color-vert-50: #f9fee7;` and `--color-vert-500: #96c919;`. Skip if already present.

- [ ] **Step 2: Create the switcher**

Create `components/dashboard/profile-switcher.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useFiscalProfile } from '@/components/dashboard/fiscal-profile-context';

export default function ProfileSwitcher() {
  const { profiles, activeProfile, setActiveProfile, loading } = useFiscalProfile();
  const [open, setOpen] = useState(false);

  if (loading || profiles.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 w-[225px] items-center justify-between gap-2 rounded-lg border border-ui-border-accented py-2 pl-1.5 pr-2 transition-colors ${open ? 'bg-vert-50' : 'bg-white'}`}
        aria-label="Changer de profil fiscal"
        aria-expanded={open}
        title={activeProfile ? `${activeProfile.label} · ${activeProfile.commune}` : undefined}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <img src="/assets/lots.webp" alt="" className="size-7 shrink-0 rounded-lg" />
          <span className="truncate text-xs font-medium text-vert-900">
            {activeProfile ? `n°${activeProfile.numeroFiscal}` : 'Profil fiscal'}
          </span>
        </span>
        {open
          ? <ChevronUp size={20} className="shrink-0 text-vert-900" />
          : <ChevronDown size={20} className="shrink-0 text-vert-900" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full z-20 mt-1.5 flex w-[225px] flex-col gap-[7px] rounded-xl bg-white p-2 shadow-md">
            {profiles.map((p) => {
              const isActive = p.id === activeProfile?.id;
              return (
                <button
                  key={p.id}
                  onClick={() => { setActiveProfile(p.id); setOpen(false); }}
                  className={`flex items-center justify-between gap-2 rounded-lg p-2 transition-colors ${isActive ? 'border border-vert-500' : 'border border-transparent hover:bg-ui-bg-elevated'}`}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <img src="/assets/lots.webp" alt="" className="size-7 shrink-0 rounded-lg" />
                    <span className="truncate text-xs font-medium text-vert-900">n°{p.numeroFiscal}</span>
                  </span>
                  <span className={`flex size-5 shrink-0 items-center justify-center rounded-full ${isActive ? 'bg-vert-900' : 'border border-ui-border-accented'}`}>
                    {isActive && <Check size={12} className="text-white" />}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Mount it in the header (top-right, AFTER "Obtenir des crédits")**

In `components/dashboard/header.tsx`, import and place it to the RIGHT of the "Obtenir des crédits" button (per placement 175:7075), wrapping both in a flex container:

```tsx
import ProfileSwitcher from '@/components/dashboard/profile-switcher';
```

Replace the single button block with:

```tsx
      <div className="flex items-center gap-3">
        <button
          onClick={() => toast('Fonctionnalité bientôt disponible')}
          className="border border-vert-900 text-vert-900 rounded-md px-3 py-2 text-sm flex items-center gap-1.5 hover:bg-vert-900/5 transition-colors"
          aria-label="Obtenir des crédits"
        >
          <Rocket size={18} />
          Obtenir des crédits
        </button>
        <ProfileSwitcher />
      </div>
```

The switcher lives in the shared `Header` (mounted by `app/(app)/layout.tsx`), so it appears on every app screen automatically.

- [ ] **Step 4: Verify build**

Run: `npx next build`
Expected: `Compiled successfully` (callers were fixed in Task 5, so the build is clean).

- [ ] **Step 5: Runtime check with Playwright (switching)**

Start dev server, navigate to `http://localhost:3137/dashboard`:
- the header shows the switcher (icon + `n°{numéro fiscal}` of the active profile), to the right of "Obtenir des crédits";
- open it, select another profile, confirm the selected item shows the green border + filled radio, and the lots table city column AND the declaration card update to the new commune;
- confirm view state resets (page back to 1, no filters, no selection).

Expected: switching profile re-scopes the dashboard with no interference. Stop the dev server afterward.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/profile-switcher.tsx components/dashboard/header.tsx app/globals.css
git commit -m 'feat(layout): add fiscal profile switcher in the header'
```

---

### Task 7: Login sets the account's default fiscal profile

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `fetchFiscalProfiles`, `setActiveFiscalProfileId`.

- [ ] **Step 1: Set the default profile on successful login**

In `app/page.tsx`, add the imports:

```tsx
import { setActiveFiscalProfileId } from '@/lib/supabase/client';
import { fetchFiscalProfiles } from '@/lib/supabase/queries';
```

After storing `orka_org` and before `router.push('/dashboard')`, select the first profile of the matched account:

```tsx
      localStorage.setItem(
        'orka_org',
        JSON.stringify({ id: match.id, name: match.name, companyId: match.company_id }),
      );

      // Default the active fiscal profile to the account's first profile.
      const profiles = await fetchFiscalProfiles(match.id);
      if (profiles[0]) setActiveFiscalProfileId(profiles[0].id);

      router.push('/dashboard');
```

- [ ] **Step 2: Verify type-check + build**

Run: `npx tsc --noEmit && npx next build`
Expected: no errors; `Compiled successfully`.

- [ ] **Step 3: End-to-end Playwright check (both accounts)**

Start dev server. From `/`:
- login `843 119 204` → dashboard shows a Foncière Atlantique profile (La Rochelle or Biarritz), lots all in that commune; switcher lists 2 profiles.
- login `552 081 317` → dashboard shows a Cabinet Démo profile (Paris/Lyon/Marseille), lots in one commune; switcher lists 3 profiles.

Expected: each account defaults to one of its own profiles; the stale profile id from the other account never leaks (resolver guards it). Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m 'feat(auth): default the active fiscal profile on login'
```

---

### Task 8: Final verification, integration commit & merge

**Files:** none (verification only)

- [ ] **Step 1: Full test + build**

Run: `npm test && npx next build`
Expected: Vitest all green (incl. `active-profile.test.ts`); build `Compiled successfully`.

- [ ] **Step 2: Manual smoke (Playwright) of the full flow**

Verify: login → default profile → switch profile updates lots + card → create a lot under a profile persists (REST count rises for that profile only) → other profile unaffected.

- [ ] **Step 3: Push branch and fast-forward main**

```bash
git push -u origin feat/fiscal-profiles-switch
git checkout main
git merge --ff-only feat/fiscal-profiles-switch
git push origin main
```

Expected: fast-forward; `main` updated. (Do not force-push; do not touch other branches.)

---

## Notes for the implementer

- **Profile propagation:** `lots-panel` and `declaration-card` read `activeProfileId` from `useFiscalProfile()` and list it in their effect deps — switching re-fetches automatically. `biens-panel` is intentionally NOT changed (already scoped by `lotId`).
- **Stale profile safety:** `resolveActiveProfileId` discards a stored id that doesn't belong to the current account; login also overwrites it. Both layers matter (switching accounts in the same browser).
- **Naming:** never reuse `profiles` (auth user profiles) for this feature; always `fiscal_profiles` / `FiscalProfile` / fiscal-profile.
- **Demo only:** `fiscal_profiles` has open demo read/write policies — must be tightened (per-profile membership) when real auth lands. This is the hook for "plusieurs personnes, pas le même profil".
- **OneDrive/Windows:** if `next build` throws `EBUSY` on `.next`, delete `.next` and retry.
