# FISC Comparison · Dégrèvement · Réclamation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compare each bien's working values against its frozen FISC snapshot (by invariant), mark it `resolu`/`anomalie`, compute a signed dégrèvement (gain/loss) using a real per-commune × étage tax rate, surface the anomalies + amounts, allow grouped bulk-edits over biens with identical values, and generate a per-lot réclamation.

**Architecture:** Pure, testable `lib/` modules (comparable fields + signature, comparison, tax resolver, signed dégrèvement, per-bien evaluation) orchestrated by Supabase query helpers that persist results onto `biens`. UI adds a bulk-edit modal and wires the anomalies screen + a réclamation action. Follows the existing pure-lib + thin-orchestration pattern.

**Tech Stack:** Next.js 16 App Router (client components), TypeScript strict, Supabase (Postgres + RLS, CLI migrations), Vitest, Tailwind v4, lucide-react, Playwright (visual checks).

## Global Constraints

- French UI copy; English code/identifiers/commits; NO reference to AI/Claude anywhere; conventional commits, no Co-Authored-By.
- TypeScript strict: zero `any`, no unused imports/vars, `const` over `let`.
- Business logic lives in pure `lib/` modules (testable without Next/Supabase); query helpers orchestrate and persist. UI holds no business logic.
- Demo single-tenant: new tables get `demo public read` / `demo public write` RLS (`using (true)`); migrations idempotent (`if not exists`, `drop policy if exists`). Tighten with real auth later (out of scope).
- Supabase CLI: apply with `echo y | supabase db push`; regenerate types with `supabase gen types typescript --linked 2>/dev/null > lib/supabase/types.ts` (the `2>/dev/null` avoids CLI prose polluting the file).
- Windows/OneDrive: if `next build` throws `EBUSY` on `.next`, delete `.next` and retry.
- **COMPARABLE_FIELDS (the 11 fields)**: `surface_m2, nb_pieces, nb_wc, nb_baignoires, nb_douches, nb_bidets, nb_eviers, ascenseur, eau_courante, gaz, electricite`.
- Signed dégrèvement: `(VLC_fisc − VLC_corrige) × resolveTaux(commune, etage)` — may be negative.
- Branch: `feat/fisc-comparison-degrevement` (already created, spec committed). Merge to main only when complete & verified.

---

## File Structure

**Created:**
- `lib/domain/comparable.ts` — `COMPARABLE_FIELDS`, `ComparableValues` type, `bienSignature()`.
- `lib/domain/comparable.test.ts`
- `lib/tax/taux.ts` — `TAUX_PAR_COMMUNE`, `etageCoefficient()`, `resolveTaux()`.
- `lib/tax/taux.test.ts`
- `lib/comparison/compare.ts` — `compareBien()` → field diffs.
- `lib/comparison/compare.test.ts`
- `lib/comparison/evaluate.ts` — `evaluateBien()` → `{ statut, anomalies, degrevement }`.
- `lib/comparison/evaluate.test.ts`
- `supabase/migrations/0011_biens_fisc_snapshot.sql`
- `supabase/migrations/0012_reclamations.sql`
- `components/dashboard/bulk-edit-modal.tsx`

**Modified:**
- `lib/degrevement/compute.ts` — add `computeVlc()` (raw VLC) reused by evaluate.
- `lib/supabase/queries.ts` — `recomputeBiens()`, `bulkUpdateBiens()`, `fetchAnomalyBiens()`, `createReclamation()`.
- `lib/biens/display.ts` — `BienDisplayRow`/`dbBienToBien` carry `anomalies` + `degrevement_estime`.
- `lib/domain/property.ts` — `Bien` gains `anomalies` + `degrevement`.
- `lib/supabase/types.ts` — regenerated.
- `components/dashboard/anomalies-panel.tsx` — per-bien anomaly + montant ±; Édition button.
- `components/dashboard/statsbar-anomalies.tsx` — wire real counts/montant.
- `components/dashboard/biens-panel.tsx` — Édition button + bulk-edit modal.

---

### Task 1: Comparable fields + signature

**Files:**
- Create: `lib/domain/comparable.ts`, `lib/domain/comparable.test.ts`

**Interfaces:**
- Produces: `COMPARABLE_FIELDS: readonly string[]` (the 11 keys); `interface ComparableValues { surface_m2: number|null; nb_pieces: number|null; nb_wc: number|null; nb_baignoires: number|null; nb_douches: number|null; nb_bidets: number|null; nb_eviers: number|null; ascenseur: boolean|null; eau_courante: boolean|null; gaz: boolean|null; electricite: boolean|null }`; `bienSignature(v: ComparableValues): string`.

- [ ] **Step 1: Write the failing test**

Create `lib/domain/comparable.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { COMPARABLE_FIELDS, bienSignature, type ComparableValues } from './comparable';

const base: ComparableValues = {
  surface_m2: 28, nb_pieces: 3, nb_wc: 1, nb_baignoires: 0, nb_douches: 1,
  nb_bidets: 0, nb_eviers: 1, ascenseur: true, eau_courante: true, gaz: false, electricite: true,
};

describe('comparable', () => {
  it('exposes the 11 comparable fields', () => {
    expect(COMPARABLE_FIELDS).toHaveLength(11);
    expect(COMPARABLE_FIELDS).toContain('surface_m2');
    expect(COMPARABLE_FIELDS).toContain('electricite');
  });

  it('gives identical biens the same signature', () => {
    expect(bienSignature(base)).toBe(bienSignature({ ...base }));
  });

  it('gives a different signature when any comparable field differs', () => {
    expect(bienSignature(base)).not.toBe(bienSignature({ ...base, nb_douches: 0 }));
  });

  it('treats null distinctly from 0', () => {
    expect(bienSignature(base)).not.toBe(bienSignature({ ...base, nb_bidets: null }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/domain/comparable.test.ts`
Expected: FAIL — cannot resolve `./comparable`.

- [ ] **Step 3: Implement**

Create `lib/domain/comparable.ts`:

```ts
/** The 11 bien fields susceptible to correction and compared against the FISC snapshot. */
export const COMPARABLE_FIELDS = [
  'surface_m2', 'nb_pieces', 'nb_wc', 'nb_baignoires', 'nb_douches',
  'nb_bidets', 'nb_eviers', 'ascenseur', 'eau_courante', 'gaz', 'electricite',
] as const;

export type ComparableField = (typeof COMPARABLE_FIELDS)[number];

export type ComparableValues = {
  surface_m2: number | null;
  nb_pieces: number | null;
  nb_wc: number | null;
  nb_baignoires: number | null;
  nb_douches: number | null;
  nb_bidets: number | null;
  nb_eviers: number | null;
  ascenseur: boolean | null;
  eau_courante: boolean | null;
  gaz: boolean | null;
  electricite: boolean | null;
};

/** Stable key over the 11 comparable fields; biens with the same signature are
 *  "identical" and can be bulk-edited together (invariants differ). `null` is
 *  encoded distinctly from 0/false. */
export function bienSignature(v: ComparableValues): string {
  return COMPARABLE_FIELDS.map((f) => {
    const raw = v[f];
    return raw === null || raw === undefined ? '∅' : String(raw);
  }).join('|');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/domain/comparable.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/domain/comparable.ts lib/domain/comparable.test.ts
git commit -m 'feat(api): add comparable fields and bien signature'
```

---

### Task 2: Migration 0011 — fisc_snapshot + anomalies, snapshot existing biens

**Files:**
- Create: `supabase/migrations/0011_biens_fisc_snapshot.sql`
- Modify (regenerate): `lib/supabase/types.ts`

**Interfaces:**
- Produces (DB): `biens.fisc_snapshot jsonb` (the 11 comparable values = FISC baseline), `biens.anomalies jsonb` (diff result, default `[]`). Existing biens get `fisc_snapshot` filled from their current values.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0011_biens_fisc_snapshot.sql`:

```sql
-- Migration: 0011_biens_fisc_snapshot
-- The biens columns hold the FISC reference. Freeze the 11 comparable fields into
-- fisc_snapshot so later corrections (manual/bulk/import) can be diffed against it.
-- anomalies holds the per-field diff after comparison.

alter table public.biens add column if not exists fisc_snapshot jsonb;
alter table public.biens add column if not exists anomalies jsonb not null default '[]'::jsonb;

-- Freeze the current (FISC) values for existing biens where not already frozen.
update public.biens set fisc_snapshot = jsonb_build_object(
  'surface_m2', surface_m2,
  'nb_pieces', nb_pieces,
  'nb_wc', nb_wc,
  'nb_baignoires', nb_baignoires,
  'nb_douches', nb_douches,
  'nb_bidets', nb_bidets,
  'nb_eviers', nb_eviers,
  'ascenseur', ascenseur,
  'eau_courante', eau_courante,
  'gaz', gaz,
  'electricite', electricite
) where fisc_snapshot is null;
```

- [ ] **Step 2: Apply + regenerate types**

Run: `echo y | supabase db push` then `supabase gen types typescript --linked 2>/dev/null > lib/supabase/types.ts`
Expected: migration applied; `fisc_snapshot` + `anomalies` present in types.

- [ ] **Step 3: Verify the snapshot was filled**

Run (URL/KEY from `.env.local`):
```bash
URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2- | tr -d '"\r'); KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2- | tr -d '"\r')
curl -s "$URL/rest/v1/biens?select=invariant_cadastral,fisc_snapshot&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
```
Expected: `fisc_snapshot` is a JSON object with the 11 keys (not null).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0011_biens_fisc_snapshot.sql lib/supabase/types.ts
git commit -m 'feat(api): freeze fisc_snapshot and add anomalies on biens'
```

---

### Task 3: Tax resolver (per-commune × étage)

**Files:**
- Create: `lib/tax/taux.ts`, `lib/tax/taux.test.ts`

**Interfaces:**
- Produces: `TAUX_PAR_COMMUNE: Record<string, number>` (keyed by `depcom`); `etageCoefficient(etage: string | null): number`; `resolveTaux(depcom: string | null, etage: string | null): number` = `(TAUX_PAR_COMMUNE[depcom] ?? DEFAULT_TAUX) * etageCoefficient(etage)`.

- [ ] **Step 1: Write the failing test**

Create `lib/tax/taux.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveTaux, etageCoefficient, TAUX_PAR_COMMUNE } from './taux';

describe('taux', () => {
  it('has a real rate per known commune (by depcom)', () => {
    expect(TAUX_PAR_COMMUNE['75111']).toBeGreaterThan(0); // Paris 11e
    expect(TAUX_PAR_COMMUNE['94077']).toBeGreaterThan(0); // Villeneuve-le-Roi
  });

  it('ground floor coefficient is 1', () => {
    expect(etageCoefficient('0')).toBe(1);
  });

  it('higher floors raise the coefficient', () => {
    expect(etageCoefficient('3')).toBeGreaterThan(etageCoefficient('0'));
  });

  it('resolveTaux multiplies commune rate by the étage coefficient', () => {
    expect(resolveTaux('75111', '0')).toBeCloseTo(TAUX_PAR_COMMUNE['75111']);
    expect(resolveTaux('75111', '3')).toBeCloseTo(TAUX_PAR_COMMUNE['75111'] * etageCoefficient('3'));
  });

  it('falls back to the default rate for an unknown commune', () => {
    expect(resolveTaux('00000', '0')).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/tax/taux.test.ts`
Expected: FAIL — cannot resolve `./taux`.

- [ ] **Step 3: Implement**

Create `lib/tax/taux.ts`:

```ts
/** Taux d'imposition de la taxe foncière par commune (clé = depcom INSEE).
 *  Valeurs réelles à affiner ; structure prête. */
export const TAUX_PAR_COMMUNE: Record<string, number> = {
  '75111': 0.2015, // Paris 11e
  '69383': 0.2934, // Lyon 3e
  '13206': 0.3438, // Marseille 6e
  '17300': 0.4521, // La Rochelle
  '64122': 0.3712, // Biarritz
  '94077': 0.4189, // Villeneuve-le-Roi
};

/** Taux par défaut pour une commune non répertoriée. */
export const DEFAULT_TAUX = 0.35;

/** Le taux est aussi modulé par l'étage : +2 % par étage au-dessus du rez. */
export function etageCoefficient(etage: string | null): number {
  const n = etage == null ? 0 : parseInt(etage, 10);
  const floor = Number.isFinite(n) ? Math.max(0, n) : 0;
  return 1 + floor * 0.02;
}

/** Taux d'imposition effectif = taux commune × coefficient étage. */
export function resolveTaux(depcom: string | null, etage: string | null): number {
  const base = (depcom && TAUX_PAR_COMMUNE[depcom]) || DEFAULT_TAUX;
  return base * etageCoefficient(etage);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/tax/taux.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tax/taux.ts lib/tax/taux.test.ts
git commit -m 'feat(api): add per-commune x etage tax rate resolver'
```

---

### Task 4: Raw VLC from comparable values

**Files:**
- Modify: `lib/degrevement/compute.ts`
- Test: `lib/degrevement/compute.test.ts` (append)

**Interfaces:**
- Consumes: `Bareme`, `DEFAULT_BAREME` from `lib/degrevement/bareme`.
- Produces: `computeVlc(input: VlcInput, bareme: Bareme): number` where `VlcInput = ComparableValues & { ponderation_nature: number; categorie: string; coeff_entretien: number|null; coeff_situation_particuliere: number|null; coeff_situation_generale: number|null }`. Reuses the existing surface-pondérée + tarif + coeffs maths (no `vlc_reference`, no tax — just the recalculated VLC).

- [ ] **Step 1: Write the failing test**

Append to `lib/degrevement/compute.test.ts`:

```ts
import { computeVlc } from './compute';
import { DEFAULT_BAREME } from './bareme';

describe('computeVlc', () => {
  const v = {
    surface_m2: 28, ponderation_nature: 1, categorie: '6',
    coeff_entretien: 1, coeff_situation_particuliere: 1, coeff_situation_generale: 1,
    nb_pieces: 3, nb_wc: 1, nb_baignoires: 0, nb_douches: 1, nb_bidets: 0, nb_eviers: 1,
    ascenseur: false, eau_courante: true, gaz: false, electricite: true,
  };

  it('drops when a sanitary equipment is removed', () => {
    const full = computeVlc(v, DEFAULT_BAREME);
    const minusShower = computeVlc({ ...v, nb_douches: 0 }, DEFAULT_BAREME);
    expect(minusShower).toBeLessThan(full);
  });

  it('is positive for a normal apartment', () => {
    expect(computeVlc(v, DEFAULT_BAREME)).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/degrevement/compute.test.ts -t computeVlc`
Expected: FAIL — `computeVlc` is not exported.

- [ ] **Step 3: Implement**

In `lib/degrevement/compute.ts`, add (above `computeDegrevement`, reusing the same maths):

```ts
export interface VlcInput {
  surface_m2: number | null;
  ponderation_nature: number;
  categorie: string;
  coeff_entretien: number | null;
  coeff_situation_particuliere: number | null;
  coeff_situation_generale: number | null;
  eau_courante: boolean | null;
  gaz: boolean | null;
  electricite: boolean | null;
  ascenseur: boolean | null;
  nb_wc: number | null;
  nb_baignoires: number | null;
  nb_douches: number | null;
  nb_bidets: number | null;
  nb_eviers: number | null;
}

/** Valeur locative cadastrale recalculée à partir des caractéristiques du bien. */
export function computeVlc(b: VlcInput, bareme: Bareme): number {
  const e = bareme.equivalencesEquipements;
  const sanitaires = n(b.nb_wc) + n(b.nb_baignoires) + n(b.nb_douches) + n(b.nb_bidets) + n(b.nb_eviers);
  const equivalences =
    (b.eau_courante ? e.eau : 0) + (b.gaz ? e.gaz : 0) +
    (b.electricite ? e.electricite : 0) + (b.ascenseur ? e.ascenseur : 0) +
    sanitaires * e.parSanitaire;
  const surfacePonderee = n(b.surface_m2) * b.ponderation_nature + equivalences;
  const tarif = bareme.tarifParCategorie[b.categorie] ?? 0;
  const coeffs = n(b.coeff_entretien, 1) * n(b.coeff_situation_particuliere, 1) * n(b.coeff_situation_generale, 1);
  return surfacePonderee * tarif * coeffs;
}
```

(`n`, `Bareme` are already in the file.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/degrevement/compute.test.ts`
Expected: PASS (existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add lib/degrevement/compute.ts lib/degrevement/compute.test.ts
git commit -m 'feat(api): expose raw VLC computation from bien characteristics'
```

---

### Task 5: Field comparison (FISC vs working)

**Files:**
- Create: `lib/comparison/compare.ts`, `lib/comparison/compare.test.ts`

**Interfaces:**
- Consumes: `COMPARABLE_FIELDS`, `ComparableValues` (Task 1).
- Produces: `interface FieldAnomaly { field: string; fiscValue: number|boolean|null; newValue: number|boolean|null }`; `compareBien(fisc: ComparableValues, working: ComparableValues): FieldAnomaly[]` — one entry per comparable field whose value differs.

- [ ] **Step 1: Write the failing test**

Create `lib/comparison/compare.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { compareBien } from './compare';
import type { ComparableValues } from '@/lib/domain/comparable';

const fisc: ComparableValues = {
  surface_m2: 28, nb_pieces: 3, nb_wc: 1, nb_baignoires: 0, nb_douches: 1,
  nb_bidets: 0, nb_eviers: 1, ascenseur: true, eau_courante: true, gaz: false, electricite: true,
};

describe('compareBien', () => {
  it('returns no anomaly when identical', () => {
    expect(compareBien(fisc, { ...fisc })).toEqual([]);
  });

  it('reports each differing field with fisc and new values', () => {
    const res = compareBien(fisc, { ...fisc, nb_douches: 0, surface_m2: 30 });
    expect(res).toHaveLength(2);
    expect(res).toContainEqual({ field: 'nb_douches', fiscValue: 1, newValue: 0 });
    expect(res).toContainEqual({ field: 'surface_m2', fiscValue: 28, newValue: 30 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/comparison/compare.test.ts`
Expected: FAIL — cannot resolve `./compare`.

- [ ] **Step 3: Implement**

Create `lib/comparison/compare.ts`:

```ts
import { COMPARABLE_FIELDS, type ComparableValues } from '@/lib/domain/comparable';

export interface FieldAnomaly {
  field: string;
  fiscValue: number | boolean | null;
  newValue: number | boolean | null;
}

/** Diff the working values against the FISC snapshot over the comparable fields. */
export function compareBien(fisc: ComparableValues, working: ComparableValues): FieldAnomaly[] {
  const out: FieldAnomaly[] = [];
  for (const field of COMPARABLE_FIELDS) {
    const fiscValue = fisc[field] ?? null;
    const newValue = working[field] ?? null;
    if (fiscValue !== newValue) out.push({ field, fiscValue, newValue });
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/comparison/compare.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/comparison/compare.ts lib/comparison/compare.test.ts
git commit -m 'feat(api): add FISC vs working field comparison'
```

---

### Task 6: Per-bien evaluation (statut + anomalies + signed dégrèvement)

**Files:**
- Create: `lib/comparison/evaluate.ts`, `lib/comparison/evaluate.test.ts`

**Interfaces:**
- Consumes: `compareBien`/`FieldAnomaly` (Task 5), `computeVlc`/`VlcInput` (Task 4), `resolveTaux` (Task 3), `Bareme`/`DEFAULT_BAREME`, `ComparableValues`, `BienStatut`.
- Produces: `interface EvaluateInput { fisc: ComparableValues; working: ComparableValues; ponderation_nature: number; categorie: string; coeff_entretien: number|null; coeff_situation_particuliere: number|null; coeff_situation_generale: number|null; depcom: string|null; etage: string|null }`; `interface BienEvaluation { statut: BienStatut; anomalies: FieldAnomaly[]; degrevement: number }`; `evaluateBien(input: EvaluateInput, bareme?: Bareme): BienEvaluation`. No anomalies → `{ statut: 'resolu', anomalies: [], degrevement: 0 }`. Anomalies → `{ statut: 'anomalie', anomalies, degrevement: (VLC_fisc − VLC_working) × resolveTaux(depcom, etage) }` (rounded to 2 decimals, signed).

- [ ] **Step 1: Write the failing test**

Create `lib/comparison/evaluate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { evaluateBien, type EvaluateInput } from './evaluate';
import type { ComparableValues } from '@/lib/domain/comparable';

const fisc: ComparableValues = {
  surface_m2: 28, nb_pieces: 3, nb_wc: 1, nb_baignoires: 0, nb_douches: 1,
  nb_bidets: 0, nb_eviers: 1, ascenseur: false, eau_courante: true, gaz: false, electricite: true,
};
const baseInput = (working: ComparableValues): EvaluateInput => ({
  fisc, working, ponderation_nature: 1, categorie: '6',
  coeff_entretien: 1, coeff_situation_particuliere: 1, coeff_situation_generale: 1,
  depcom: '75111', etage: '0',
});

describe('evaluateBien', () => {
  it('is resolu with 0 dégrèvement when unchanged', () => {
    const r = evaluateBien(baseInput({ ...fisc }));
    expect(r.statut).toBe('resolu');
    expect(r.anomalies).toEqual([]);
    expect(r.degrevement).toBe(0);
  });

  it('is anomalie with a POSITIVE dégrèvement when a shower is removed (lower VLC)', () => {
    const r = evaluateBien(baseInput({ ...fisc, nb_douches: 0 }));
    expect(r.statut).toBe('anomalie');
    expect(r.anomalies).toHaveLength(1);
    expect(r.degrevement).toBeGreaterThan(0);
  });

  it('is anomalie with a NEGATIVE dégrèvement when surface increases (higher VLC)', () => {
    const r = evaluateBien(baseInput({ ...fisc, surface_m2: 40 }));
    expect(r.statut).toBe('anomalie');
    expect(r.degrevement).toBeLessThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/comparison/evaluate.test.ts`
Expected: FAIL — cannot resolve `./evaluate`.

- [ ] **Step 3: Implement**

Create `lib/comparison/evaluate.ts`:

```ts
import type { ComparableValues } from '@/lib/domain/comparable';
import type { BienStatut } from '@/lib/domain/property';
import { compareBien, type FieldAnomaly } from './compare';
import { computeVlc, type VlcInput } from '@/lib/degrevement/compute';
import { resolveTaux } from '@/lib/tax/taux';
import { DEFAULT_BAREME, type Bareme } from '@/lib/degrevement/bareme';

export interface EvaluateInput {
  fisc: ComparableValues;
  working: ComparableValues;
  ponderation_nature: number;
  categorie: string;
  coeff_entretien: number | null;
  coeff_situation_particuliere: number | null;
  coeff_situation_generale: number | null;
  depcom: string | null;
  etage: string | null;
}

export interface BienEvaluation {
  statut: BienStatut;
  anomalies: FieldAnomaly[];
  degrevement: number;
}

const round2 = (x: number) => Math.round(x * 100) / 100;

const vlcInput = (c: ComparableValues, i: EvaluateInput): VlcInput => ({
  ...c,
  ponderation_nature: i.ponderation_nature,
  categorie: i.categorie,
  coeff_entretien: i.coeff_entretien,
  coeff_situation_particuliere: i.coeff_situation_particuliere,
  coeff_situation_generale: i.coeff_situation_generale,
});

/** Compare a bien, derive its tunnel statut and signed dégrèvement (gain/loss). */
export function evaluateBien(input: EvaluateInput, bareme: Bareme = DEFAULT_BAREME): BienEvaluation {
  const anomalies = compareBien(input.fisc, input.working);
  if (anomalies.length === 0) {
    return { statut: 'resolu', anomalies: [], degrevement: 0 };
  }
  const vlcFisc = computeVlc(vlcInput(input.fisc, input), bareme);
  const vlcWorking = computeVlc(vlcInput(input.working, input), bareme);
  const degrevement = round2((vlcFisc - vlcWorking) * resolveTaux(input.depcom, input.etage));
  return { statut: 'anomalie', anomalies, degrevement };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/comparison/evaluate.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/comparison/evaluate.ts lib/comparison/evaluate.test.ts
git commit -m 'feat(api): evaluate a bien into statut, anomalies and signed degrevement'
```

---

### Task 7: Persist evaluation + extend Bien/display (recompute + bulk update queries)

**Files:**
- Modify: `lib/supabase/queries.ts`, `lib/domain/property.ts`, `lib/biens/display.ts`

**Interfaces:**
- Consumes: `evaluateBien` (Task 6), `ComparableValues` (Task 1), `FieldAnomaly` (Task 5).
- Produces:
  - `Bien` gains `anomalies: FieldAnomaly[]` and `degrevement: number` (in `lib/domain/property.ts`).
  - `BIEN_DISPLAY_COLUMNS`/`dbBienToBien` carry `anomalies` + `degrevement_estime`.
  - `recomputeBiens(bienIds: string[]): Promise<void>` — loads each bien's fisc_snapshot + working + pondération/catégorie/coeffs + depcom/etage, runs `evaluateBien`, persists `statut`, `has_anomaly`, `anomalies`, `degrevement_estime`.
  - `bulkUpdateBiens(bienIds: string[], patch: Partial<ComparableValues>): Promise<void>` — updates the working columns for the given biens, then calls `recomputeBiens`.

- [ ] **Step 1: Extend the Bien type**

In `lib/domain/property.ts`, add to `Bien`:
```ts
  anomalies: import('@/lib/comparison/compare').FieldAnomaly[];
  degrevement: number;
```
(Or import the type at top and reference it; keep `Bien` otherwise unchanged.)

- [ ] **Step 2: Extend display mapping**

In `lib/biens/display.ts`:
- Add `'fisc_snapshot' | 'anomalies' | 'degrevement_estime'` to the `BienDisplayRow` Pick and to `BIEN_DISPLAY_COLUMNS` (`..., statut, has_anomaly, fisc_snapshot, anomalies, degrevement_estime`).
- In `dbBienToBien`, set `anomalies: (row.anomalies as FieldAnomaly[]) ?? []` and `degrevement: Number(row.degrevement_estime ?? 0)` (import `FieldAnomaly`).

- [ ] **Step 3: Add recompute + bulk update to queries.ts**

In `lib/supabase/queries.ts`, add (import `evaluateBien`, `ComparableValues`):

```ts
const COMPARABLE_KEYS = [
  'surface_m2', 'nb_pieces', 'nb_wc', 'nb_baignoires', 'nb_douches',
  'nb_bidets', 'nb_eviers', 'ascenseur', 'eau_courante', 'gaz', 'electricite',
] as const;

function pickComparable(row: Record<string, unknown>): ComparableValues {
  const out = {} as Record<string, unknown>;
  for (const k of COMPARABLE_KEYS) out[k] = row[k] ?? null;
  return out as unknown as ComparableValues;
}

export async function recomputeBiens(bienIds: string[]): Promise<void> {
  if (bienIds.length === 0) return;
  const supabase = createClient();
  const { data, error } = await supabase
    .from('biens')
    .select('id, fisc_snapshot, ponderation_nature, categorie, coeff_entretien, coeff_situation_particuliere, coeff_situation_generale, depcom, etage, surface_m2, nb_pieces, nb_wc, nb_baignoires, nb_douches, nb_bidets, nb_eviers, ascenseur, eau_courante, gaz, electricite')
    .in('id', bienIds);
  if (error) throw error;
  await Promise.all((data ?? []).map(async (row) => {
    const evalResult = evaluateBien({
      fisc: (row.fisc_snapshot as ComparableValues) ?? pickComparable(row),
      working: pickComparable(row),
      ponderation_nature: Number(row.ponderation_nature ?? 1),
      categorie: String(row.categorie ?? ''),
      coeff_entretien: row.coeff_entretien as number | null,
      coeff_situation_particuliere: row.coeff_situation_particuliere as number | null,
      coeff_situation_generale: row.coeff_situation_generale as number | null,
      depcom: (row.depcom as string | null) ?? null,
      etage: (row.etage as string | null) ?? null,
    });
    const { error: upErr } = await supabase.from('biens').update({
      statut: evalResult.statut,
      has_anomaly: evalResult.anomalies.length > 0,
      anomalies: evalResult.anomalies,
      degrevement_estime: evalResult.degrevement,
    }).eq('id', row.id);
    if (upErr) throw upErr;
  }));
}

export async function bulkUpdateBiens(bienIds: string[], patch: Partial<ComparableValues>): Promise<void> {
  if (bienIds.length === 0) return;
  const supabase = createClient();
  const { error } = await supabase.from('biens').update(patch).in('id', bienIds);
  if (error) throw error;
  await recomputeBiens(bienIds);
}
```

- [ ] **Step 4: Verify type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors (callers updated where `Bien` is constructed — `mapBien` in queries.ts must also set `anomalies`/`degrevement`; add `anomalies: [], degrevement: 0` defaults there if those columns aren't selected, or include them in the select + map).

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/queries.ts lib/domain/property.ts lib/biens/display.ts
git commit -m 'feat(api): persist bien evaluation and add recompute/bulk-update'
```

---

### Task 8: Anomalies screen — per-bien anomaly + signed amount, wired statsbar

**Files:**
- Modify: `components/dashboard/anomalies-panel.tsx`, `components/dashboard/statsbar-anomalies.tsx`, `lib/supabase/queries.ts` (`fetchAnomalyBiensByProfile` already exists — ensure it selects anomalies + degrevement via the display columns).

**Interfaces:**
- Consumes: `Bien.anomalies`, `Bien.degrevement` (Task 7).

- [ ] **Step 1: Show the anomaly + amount per row**

In `anomalies-panel.tsx`, in the row render, add a cell that renders the first anomaly field label and the signed dégrèvement. Replace the "Dégrèvement estimés / En attente" cell content with:
```tsx
<td className="px-4 py-3">
  {bien.anomalies.length > 0 ? (
    <span className="text-xs text-ui-text-muted">
      {bien.anomalies.map((a) => a.field).join(', ')}
    </span>
  ) : <span className="text-xs text-ui-text-dimmed">—</span>}
</td>
<td className="px-4 py-3 whitespace-nowrap">
  <span className={bien.degrevement >= 0 ? 'text-success-txt font-medium' : 'text-error font-medium'}>
    {bien.degrevement >= 0 ? '+' : ''}{bien.degrevement.toFixed(2)} €
  </span>
</td>
```
(Adjust the header row to add "Anomalie" and "Dégrèvement ±" columns and bump `colSpan` on the empty-state row accordingly.)

- [ ] **Step 2: Wire the statsbar**

Make `StatsbarAnomalies` accept props `{ count: number; rate: number; montant: number }` and render them (count = anomalies, rate = `count/total` as %, montant = Σ positive degrevements). In `anomalies-panel.tsx` compute from `biens`:
```tsx
const montant = biens.reduce((s, b) => s + Math.max(0, b.degrevement), 0);
const total = biens.length; // anomalies are the loaded set
<StatsbarAnomalies count={biens.length} rate={total ? 100 : 0} montant={montant} />
```
(If a fuller total is desired later, pass the lot/profile total; for now the loaded anomalies are the qualified set.)

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit && npx next build`
Expected: compiles.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/anomalies-panel.tsx components/dashboard/statsbar-anomalies.tsx lib/supabase/queries.ts
git commit -m 'feat(dashboard): show per-bien anomaly and signed amount, wire statsbar'
```

---

### Task 9: Bulk-edit modal (group by signature)

**Files:**
- Create: `components/dashboard/bulk-edit-modal.tsx`

**Interfaces:**
- Consumes: `COMPARABLE_FIELDS`, `bienSignature`, `ComparableValues` (Task 1); `Bien` (carries the comparable values? — NO: `Bien` is the display shape). The modal works on a list of `{ id, signature, label, values }` passed by the panel. Define:
  `interface BulkEditBien { id: string; signature: string; label: string; values: ComparableValues }`.
- Produces: default-exported `<BulkEditModal open biens onClose onApply />` where `onApply(bienIds: string[], patch: Partial<ComparableValues>): Promise<void>`.

- [ ] **Step 1: Create the modal**

Create `components/dashboard/bulk-edit-modal.tsx` (`'use client'`): group the passed `biens` by `signature`; render each group with a header (label + count + a "tout cocher le groupe" checkbox) and per-bien checkboxes; a field `<select>` over `COMPARABLE_FIELDS` + a value input (number, or a Oui/Non select for the boolean fields `ascenseur, eau_courante, gaz, electricite`); an "Appliquer" button calling `onApply([...checkedIds], { [field]: parsedValue })` then closing. Mirror `confirm-delete-modal.tsx`/`modal.tsx` overlay + Escape/backdrop close. French copy. No business logic beyond grouping + value parsing.

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/bulk-edit-modal.tsx
git commit -m 'feat(dashboard): add grouped bulk-edit modal'
```

---

### Task 10: Wire the Édition button + bulk-edit into the biens panel

**Files:**
- Modify: `components/dashboard/biens-panel.tsx`

**Interfaces:**
- Consumes: `BulkEditModal` (Task 9), `bulkUpdateBiens` (Task 7), `bienSignature` (Task 1). The panel's loaded biens currently come from `dbBienToBien` (display shape) which does NOT include the comparable values — so the panel must also load the comparable values to build `BulkEditBien[]`.

- [ ] **Step 1: Load comparable values for the lot's biens**

In `biens-panel.tsx`, extend `loadBiens` (or add a parallel fetch) to also fetch `id, surface_m2, nb_pieces, nb_wc, nb_baignoires, nb_douches, nb_bidets, nb_eviers, ascenseur, eau_courante, gaz, electricite` for the lot; keep them in a `Map<string, ComparableValues>` state.

- [ ] **Step 2: Add the Édition button + modal**

Add an "Édition" button to the panel toolbar/header area (next to Importer). State `editOpen`. Build `BulkEditBien[]` from the loaded biens (`label` = `${type} ${surface}`, `signature` = `bienSignature(values)`). Render `<BulkEditModal open={editOpen} biens={bulkBiens} onClose={() => setEditOpen(false)} onApply={async (ids, patch) => { await bulkUpdateBiens(ids, patch); await loadBiens(); setEditOpen(false); }} />`.

- [ ] **Step 3: Recompute after import too (import = a correction)**

In `biens-panel.tsx` `handleImportConfirm`, after the insert/update of biens succeeds, collect the affected bien ids and call `await recomputeBiens(affectedIds)` before `loadBiens()`, so imported corrections produce anomalies/dégrèvement just like the bulk-edit. (Get the affected ids from the insert `.select('id')` results and the matched-update ids the handler already computes.)

- [ ] **Step 4: Verify build + Playwright sanity**

Run: `npx tsc --noEmit && npx next build`. Then (controller) open a lot's biens, click Édition, select a same-signature group, change `nb_douches`, Apply → those biens flip to `anomalie` with a non-zero amount.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/biens-panel.tsx
git commit -m 'feat(dashboard): wire grouped bulk-edit into the biens panel'
```

---

### Task 11: Migration 0012 — reclamations table

**Files:**
- Create: `supabase/migrations/0012_reclamations.sql`
- Modify (regenerate): `lib/supabase/types.ts`

**Interfaces:**
- Produces (DB): `public.reclamations (id uuid pk, org_id uuid, fiscal_profile_id uuid, lot_id uuid, total_degrevement numeric not null default 0, statut text not null default 'generee', created_at timestamptz)` + demo RLS.

- [ ] **Step 1: Write + apply the migration**

Create `supabase/migrations/0012_reclamations.sql`:
```sql
-- Migration: 0012_reclamations — per-lot réclamation aggregating bien dégrèvements.
create table if not exists public.reclamations (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizations(id) on delete cascade,
  fiscal_profile_id  uuid references public.fiscal_profiles(id) on delete set null,
  lot_id             uuid not null references public.lots(id) on delete cascade,
  total_degrevement  numeric not null default 0,
  statut             text not null default 'generee',
  created_at         timestamptz not null default now()
);
alter table public.reclamations enable row level security;
drop policy if exists "demo public read"  on public.reclamations;
drop policy if exists "demo public write" on public.reclamations;
create policy "demo public read"  on public.reclamations for select using (true);
create policy "demo public write" on public.reclamations for all using (true) with check (true);
```
Run: `echo y | supabase db push` then regenerate types.

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0012_reclamations.sql lib/supabase/types.ts
git commit -m 'feat(api): add reclamations table'
```

---

### Task 12: "Générer ma réclamation" — aggregate per lot

**Files:**
- Modify: `lib/supabase/queries.ts`, `components/dashboard/anomalies-panel.tsx` (or biens-panel — wherever the lot context lives)

**Interfaces:**
- Consumes: the reclamations table (Task 11).
- Produces: `createReclamation(lotId: string): Promise<{ total: number }>` — sums `degrevement_estime` over the lot's biens, inserts a `reclamations` row (org_id + fiscal_profile_id from the lot), advances the lot's anomalie biens to `reclamation`, returns the total.

- [ ] **Step 1: Add the query**

In `queries.ts`:
```ts
export async function createReclamation(lotId: string): Promise<{ total: number }> {
  const supabase = createClient();
  const { data: lot, error: lotErr } = await supabase
    .from('lots').select('org_id, fiscal_profile_id').eq('id', lotId).single();
  if (lotErr) throw lotErr;
  const { data: biens, error: bErr } = await supabase
    .from('biens').select('degrevement_estime').eq('lot_id', lotId);
  if (bErr) throw bErr;
  const total = Math.round((biens ?? []).reduce((s, b) => s + Number(b.degrevement_estime ?? 0), 0) * 100) / 100;
  const { error: insErr } = await supabase.from('reclamations').insert({
    org_id: lot.org_id, fiscal_profile_id: lot.fiscal_profile_id, lot_id: lotId, total_degrevement: total,
  });
  if (insErr) throw insErr;
  const { error: upErr } = await supabase.from('biens')
    .update({ statut: 'reclamation' }).eq('lot_id', lotId).eq('statut', 'anomalie');
  if (upErr) throw upErr;
  return { total };
}
```

- [ ] **Step 2: Add the button**

In the anomalies panel header, add a "Générer ma réclamation" button (enabled when there is ≥1 anomalie bien for the active lot/profile). On click → `createReclamation(lotId)` → toast `Réclamation générée (${total} €)` → reload. (Lot scope: if the anomalies screen is profile-wide, generate per distinct lot among the anomalies, or expose the action on the per-lot biens screen — pick the per-lot biens screen if simpler.)

- [ ] **Step 3: Verify build + Playwright**

Run: `npx tsc --noEmit && npx next build`. Then (controller): trigger a few anomalies via bulk-edit, click "Générer ma réclamation", confirm a `reclamations` row is created (REST) with the summed total and the biens advance to `reclamation`.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/queries.ts components/dashboard/anomalies-panel.tsx
git commit -m 'feat(dashboard): generate a per-lot reclamation from bien degrevements'
```

---

### Task 13: Final verification & merge

- [ ] **Step 1:** `npm test` (all green incl. comparable/taux/compute/evaluate), `npx tsc --noEmit`, `npx next build`.
- [ ] **Step 2:** Playwright end-to-end: bulk-edit a same-signature group on a lot → anomalies appear with signed amounts → statsbar montant > 0 → "Générer ma réclamation" → reclamations row + biens at `reclamation`. Reset demo biens to `importe` + clear test reclamations afterward.
- [ ] **Step 3:** `git checkout main && git merge --ff-only feat/fisc-comparison-degrevement && git push origin main` (only after re-checking `origin/main` hasn't diverged; if it has, merge origin/main in first and re-verify).

---

## Notes
- The barème (`DEFAULT_BAREME`) and `TAUX_PAR_COMMUNE`/`etageCoefficient` carry plausible-but-placeholder values — the structure is final; real values get filled later.
- Unmatched invariants on import are out of scope here (import already upserts by invariant); this plan focuses on the compare/dégrèvement/bulk-edit/réclamation chain.
- `degrevement_estime` now stores a SIGNED value (can be negative) — the original `computeDegrevement` (clamped ≥0) stays for any other caller; the new chain uses `computeVlc` + signed math.
