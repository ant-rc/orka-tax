# KADASTRA MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the B2B MVP of Kadastra (ORKA.TAX): import a CSV/Excel of properties into a lot via a 4-step pipeline (upload → mapping → validation → restitution), browse/edit a property, and simulate its tax relief.

**Architecture:** Next.js 15 (App Router) on Vercel, Supabase (Postgres + Auth + Storage + RLS) as backend. All business logic lives in pure, unit-tested modules under `lib/`; Server Actions / Route Handlers orchestrate; UI (shadcn/ui + TanStack Table) holds no business logic.

**Tech Stack:** Next.js 15, TypeScript, Tailwind, shadcn/ui, TanStack Table v8, Zod, Supabase JS, `xlsx` (SheetJS), `csv-parse`, Vitest.

## Global Constraints

- TypeScript strict, **zero `any`** — type everything explicitly.
- No `console.log` in committed code; no unused imports/vars (prefix `_` if intentional).
- Prefer `const`; never `var`. Short, single-responsibility functions. Explicit names.
- CSS: mobile-first (`w-full sm:w-64`), `gap-*` over `margin`, `flex/grid`.
- `.env*` MUST be gitignored. Never commit secrets. Supabase service-role key server-only.
- Validate/sanitize all user input (Zod). Parameterized queries via Supabase client.
- Conventional commits: `type(scope): subject`, lowercase, ≤72 chars, no final period. Scopes available include `api, ui, auth, tests, dev, settings`. No reference to any AI assistant anywhere.
- Business logic in pure `lib/` modules, testable without Next or Supabase.
- French for UI copy and user-facing labels; English for code identifiers and commits.

---

### Task 0: Project scaffold & tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Create: `.gitignore`, `.eslintrc.json`, `.prettierrc`, `vitest.config.ts`, `commitlint.config.cjs`, `.husky/commit-msg`
- Create: `components.json` (shadcn)

**Interfaces:**
- Produces: a buildable Next.js app, `npm run dev`, `npm run build`, `npm run test` (Vitest), `npm run lint`. Path alias `@/*` → repo root.

- [ ] **Step 1: Scaffold Next.js app in the existing repo**

The repo already exists at `orka-tax/` with a `README.md`. Scaffold in place:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-npm --no-turbopack
```

If prompted about a non-empty directory, keep existing files (it only contains `README.md` + `.git`).

- [ ] **Step 2: Add dev/runtime dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr zod @tanstack/react-table xlsx csv-parse
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths prettier husky @commitlint/cli @commitlint/config-conventional
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { environment: 'node', include: ['lib/**/*.test.ts'] },
})
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 4: Set up conventional commits (husky + commitlint)**

Create `commitlint.config.cjs`:

```js
module.exports = { extends: ['@commitlint/config-conventional'] }
```

```bash
npx husky init
printf '%s\n' 'npx --no -- commitlint --edit "$1"' > .husky/commit-msg
```

Set TypeScript to strict in `tsconfig.json` (`"strict": true`) if not already.

- [ ] **Step 5: Verify build, lint, and a smoke test**

Create `lib/smoke.test.ts`:

```ts
import { expect, test } from 'vitest'
test('toolchain runs', () => { expect(1 + 1).toBe(2) })
```

Run: `npm run build && npm run lint && npm run test`
Expected: build succeeds, lint clean, 1 test passes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m 'chore(dev): scaffold next.js app with tooling and conventional commits'
```

---

### Task 1: Database schema, RLS & generated types

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `lib/supabase/types.ts` (generated)
- Create: `lib/canonical/fields.ts` (canonical field dictionary — shared by mapping/validation/UI)

**Interfaces:**
- Produces: tables `organizations, memberships, profiles, lots, biens, import_batches, column_mappings` with RLS. `CANONICAL_FIELDS` array and `CanonicalField` type consumed by Tasks 5–9.

- [ ] **Step 1: Write the canonical field dictionary**

Create `lib/canonical/fields.ts`:

```ts
export type FieldType = 'string' | 'number' | 'int' | 'boolean'

export interface CanonicalField {
  key: string
  label: string        // French UI label, anti-jargon
  type: FieldType
  required: boolean
  synonyms: string[]   // business synonyms, normalized matching happens in mapping.ts
}

export const CANONICAL_FIELDS: CanonicalField[] = [
  { key: 'invariant_cadastral', label: 'Invariant cadastral', type: 'string', required: true, synonyms: ['invariant', 'code immeuble', 'ref lot', 'reference lot'] },
  { key: 'rue', label: 'Rue', type: 'string', required: true, synonyms: ['adresse', 'voie'] },
  { key: 'depcom', label: 'Code commune', type: 'string', required: false, synonyms: ['depcom', 'code insee'] },
  { key: 'ville', label: 'Ville', type: 'string', required: true, synonyms: ['commune'] },
  { key: 'nom_immeuble', label: "Nom de l'immeuble", type: 'string', required: false, synonyms: ['immeuble', 'batiment'] },
  { key: 'nature', label: 'Nature du bien', type: 'string', required: true, synonyms: ['nature', 'type de bien'] },
  { key: 'ponderation_nature', label: 'Pondération nature', type: 'number', required: false, synonyms: ['ponderation', 'ponderation en fonction de la nature'] },
  { key: 'etage', label: 'Étage', type: 'string', required: false, synonyms: ['niveau'] },
  { key: 'categorie', label: 'Catégorie', type: 'string', required: true, synonyms: ['cat'] },
  { key: 'surface_m2', label: 'Surface habitable (m²)', type: 'number', required: true, synonyms: ['surface', 'shon', 'surface mur a mur', 'm2', 'superficie'] },
  { key: 'coeff_entretien', label: "Coefficient d'entretien", type: 'number', required: false, synonyms: ['coefficient entretien'] },
  { key: 'coeff_situation_particuliere', label: 'Coefficient situation particulière', type: 'number', required: false, synonyms: ['situation particuliere'] },
  { key: 'coeff_situation_generale', label: 'Coefficient situation générale', type: 'number', required: false, synonyms: ['situation generale'] },
  { key: 'ascenseur', label: 'Ascenseur', type: 'boolean', required: false, synonyms: ['ascenseur oui non'] },
  { key: 'eau_courante', label: 'Eau courante', type: 'boolean', required: false, synonyms: ['eau'] },
  { key: 'gaz', label: 'Raccordement gaz', type: 'boolean', required: false, synonyms: ['gaz', 'raccordement au gaz'] },
  { key: 'electricite', label: 'Raccordement électricité', type: 'boolean', required: false, synonyms: ['electricite', 'raccordement a l electricite'] },
  { key: 'nb_baignoires', label: 'Nombre de baignoires', type: 'int', required: false, synonyms: ['baignoires'] },
  { key: 'nb_douches', label: 'Nombre de douches', type: 'int', required: false, synonyms: ['receveurs de douche', 'douches'] },
  { key: 'nb_bidets', label: 'Nombre de bidets', type: 'int', required: false, synonyms: ['bidets'] },
  { key: 'nb_wc', label: 'Nombre de WC', type: 'int', required: false, synonyms: ['wc'] },
  { key: 'nb_eviers', label: "Nombre d'éviers", type: 'int', required: false, synonyms: ['eviers'] },
  { key: 'egout', label: 'Raccordement égout', type: 'boolean', required: false, synonyms: ['egout', 'raccordement a l egout'] },
  { key: 'nb_pieces', label: 'Nombre de pièces', type: 'int', required: false, synonyms: ['pieces'] },
  { key: 'nb_vide_ordures', label: 'Nombre de vide-ordures', type: 'int', required: false, synonyms: ['vide ordures'] },
]
```

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/0001_init.sql`. Define the tables from the spec §3 with `org_id` FKs, `biens` columns matching `CANONICAL_FIELDS` keys plus `status`, `completeness`, `degrevement_estime numeric`, `estimation_params jsonb`, `estimation_computed_at timestamptz`. Enable RLS on every table with the membership policy:

```sql
-- pattern repeated per table
alter table public.lots enable row level security;
create policy "members read/write own org" on public.lots
  for all using (org_id in (select org_id from public.memberships where user_id = auth.uid()))
  with check (org_id in (select org_id from public.memberships where user_id = auth.uid()));
```

Add a trigger `handle_new_user` that, on `auth.users` insert, creates a `profiles` row, an `organizations` row, and an owner `memberships` row, and sets `profiles.default_org_id`.

- [ ] **Step 3: Apply the migration to the Supabase project**

Apply via the Supabase MCP `apply_migration` tool (name: `init`, the SQL above). Then run `list_tables` to confirm all 7 tables exist.

- [ ] **Step 4: Check security advisors**

Run the Supabase MCP `get_advisors` (type `security`). Expected: no ERROR-level findings on RLS. Fix any flagged table (missing policy / RLS disabled) before continuing.

- [ ] **Step 5: Generate TypeScript types**

Use Supabase MCP `generate_typescript_types`; save output to `lib/supabase/types.ts`.

- [ ] **Step 6: Commit**

```bash
git add lib/canonical lib/supabase supabase/
git commit -m 'feat(api): add database schema, rls policies and canonical field dictionary'
```

---

### Task 2: Supabase clients, auth & app shell

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `middleware.ts`
- Create: `app/(auth)/login/page.tsx`, `app/(auth)/login/actions.ts`
- Create: `app/(app)/layout.tsx`, `components/app-sidebar.tsx`
- Create: `.env.local` (gitignored), `.env.example`

**Interfaces:**
- Consumes: `Database` type from `lib/supabase/types.ts`.
- Produces: `createServerClient()` and `createBrowserClient()` helpers; `getCurrentOrgId()` server helper returning the user's `default_org_id`; protected `(app)` route group.

- [ ] **Step 1: Env files**

`.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Create `.env.local` with real values from Supabase MCP `get_project_url` + `get_publishable_keys`. Confirm `.env*` is in `.gitignore` (add `.env*` and `!.env.example` if missing).

- [ ] **Step 2: Supabase client helpers**

Create `lib/supabase/server.ts` and `lib/supabase/client.ts` using `@supabase/ssr` (`createServerClient` with cookie handlers, `createBrowserClient`). Add `getCurrentOrgId(): Promise<string>` in `server.ts` that reads the session and returns `profiles.default_org_id`.

- [ ] **Step 3: Middleware for session refresh + route guard**

Create `middleware.ts` that refreshes the Supabase session and redirects unauthenticated requests under `/(app)` to `/login`.

- [ ] **Step 4: Login page + server action**

`app/(auth)/login/actions.ts` exports `signIn(formData)` and `signUp(formData)` Server Actions calling `supabase.auth.signInWithPassword` / `signUp`. `login/page.tsx` renders a French email/password form (shadcn `Input`/`Button`).

- [ ] **Step 5: App shell**

`app/(app)/layout.tsx` renders `components/app-sidebar.tsx` (icons + nav: Lots) and the page slot. Mobile-first: sidebar collapses under `sm`.

- [ ] **Step 6: Manual verification**

Run `npm run dev`. Sign up a test user → confirm redirect into `(app)` shell. In Supabase, confirm a row exists in `organizations` and `memberships` for that user (trigger works).
Run: `npm run build` → Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m 'feat(auth): add supabase clients, login and protected app shell'
```

---

### Task 3: Lots — list & CRUD

**Files:**
- Create: `app/(app)/lots/page.tsx`, `app/(app)/lots/actions.ts`
- Create: `components/lots/lots-table.tsx`, `components/lots/create-lot-dialog.tsx`
- Create: `lib/validation/lot.ts`

**Interfaces:**
- Consumes: `createServerClient`, `getCurrentOrgId`.
- Produces: `createLot(input)`, `updateLot(id, input)` Server Actions; `lotInputSchema` (Zod: `name` required, `reference` optional).

- [ ] **Step 1: Lot Zod schema**

Create `lib/validation/lot.ts`:

```ts
import { z } from 'zod'
export const lotInputSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  reference: z.string().optional(),
})
export type LotInput = z.infer<typeof lotInputSchema>
```

- [ ] **Step 2: Server actions**

`app/(app)/lots/actions.ts`: `createLot` and `updateLot` validate with `lotInputSchema`, insert/update via server client (RLS enforces org), `revalidatePath('/lots')`. `org_id` set from `getCurrentOrgId()`.

- [ ] **Step 3: Lots list page + table**

`lots/page.tsx` (Server Component) fetches lots for the org, renders `lots-table.tsx` (TanStack Table: name, reference, biens_count, status, created_at) with client-side search + pagination, and the `create-lot-dialog.tsx` trigger button « Créer un lot ».

- [ ] **Step 4: Manual verification**

Run `npm run dev`. Create a lot → it appears in the table. Reload → persists. Confirm a second test user (different org) does NOT see it (RLS).
Run: `npm run build` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m 'feat(ui): add lots list and creation'
```

---

### Task 4: Import pipeline — file parsing (`lib/import/parse.ts`)

**Files:**
- Create: `lib/import/parse.ts`, `lib/import/parse.test.ts`
- Create: `lib/import/fixtures/sample.csv`

**Interfaces:**
- Produces: `parseFile(buffer: Buffer, type: 'csv' | 'xlsx'): { headers: string[]; rows: Record<string, string>[] }`. Values are raw strings (normalization happens later).

- [ ] **Step 1: Write the failing test**

Create `lib/import/fixtures/sample.csv`:

```
Invariant,Ville,Surface (mur à mur) m²,Eau courante (1/0)
A123,Paris,45,1
B456,Lyon,,Oui
```

Create `lib/import/parse.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { parseFile } from './parse'

test('parses CSV headers and rows', () => {
  const buf = readFileSync(join(__dirname, 'fixtures/sample.csv'))
  const { headers, rows } = parseFile(buf, 'csv')
  expect(headers).toEqual(['Invariant', 'Ville', 'Surface (mur à mur) m²', 'Eau courante (1/0)'])
  expect(rows).toHaveLength(2)
  expect(rows[0]['Invariant']).toBe('A123')
  expect(rows[1]['Surface (mur à mur) m²']).toBe('')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/import/parse.test.ts`
Expected: FAIL — `parseFile` is not defined.

- [ ] **Step 3: Implement `parseFile`**

```ts
import { parse as parseCsv } from 'csv-parse/sync'
import * as XLSX from 'xlsx'

export interface ParsedFile {
  headers: string[]
  rows: Record<string, string>[]
}

export function parseFile(buffer: Buffer, type: 'csv' | 'xlsx'): ParsedFile {
  if (type === 'csv') {
    const records = parseCsv(buffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[]
    const headers = records.length ? Object.keys(records[0]) : []
    return { headers, rows: records }
  }
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '', raw: false })
  const headers = rows.length ? Object.keys(rows[0]) : []
  return { headers, rows }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/import/parse.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/import
git commit -m 'feat(api): add csv/excel file parser for import pipeline'
```

---

### Task 5: Import pipeline — column mapping (`lib/import/mapping.ts`)

**Files:**
- Create: `lib/import/normalize.ts`, `lib/import/levenshtein.ts`, `lib/import/mapping.ts`
- Create: `lib/import/mapping.test.ts`

**Interfaces:**
- Consumes: `CANONICAL_FIELDS` from `lib/canonical/fields.ts`.
- Produces: `autoMap(headers: string[]): MappingProposal[]` where `MappingProposal = { sourceColumn: string; suggestedField: string | null; confidence: number; status: 'auto' | 'suggest' | 'unmapped' }`. Thresholds: `confidence >= 0.8 → 'auto'`, `0.5–0.8 → 'suggest'`, `< 0.5 → 'unmapped'`.

- [ ] **Step 1: Write the failing test**

Create `lib/import/mapping.test.ts`:

```ts
import { expect, test } from 'vitest'
import { autoMap } from './mapping'

test('maps exact, synonym, fuzzy, and unknown columns', () => {
  const result = autoMap(['Surface (mur à mur) m²', 'SHON', 'Ville', 'Colonne Inconnue XYZ'])
  const by = (c: string) => result.find((r) => r.sourceColumn === c)!

  expect(by('Ville').suggestedField).toBe('ville')
  expect(by('Ville').status).toBe('auto')
  expect(by('SHON').suggestedField).toBe('surface_m2')          // business synonym
  expect(by('Surface (mur à mur) m²').suggestedField).toBe('surface_m2') // synonym normalized
  expect(by('Colonne Inconnue XYZ').status).toBe('unmapped')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/import/mapping.test.ts`
Expected: FAIL — `autoMap` not defined.

- [ ] **Step 3: Implement normalize + levenshtein + mapping**

`lib/import/normalize.ts`:

```ts
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/\(.*?\)/g, ' ')                          // drop "(1/0)", "(oui/non)"
    .replace(/m²|m2/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')                        // punctuation → space
    .trim().replace(/\s+/g, ' ')
}
```

`lib/import/levenshtein.ts`: standard Levenshtein, plus `similarity(a, b) = 1 - distance / max(a.length, b.length)`.

`lib/import/mapping.ts`:

```ts
import { CANONICAL_FIELDS } from '@/lib/canonical/fields'
import { normalize } from './normalize'
import { similarity } from './levenshtein'

export interface MappingProposal {
  sourceColumn: string
  suggestedField: string | null
  confidence: number
  status: 'auto' | 'suggest' | 'unmapped'
}

export function autoMap(headers: string[]): MappingProposal[] {
  return headers.map((sourceColumn) => {
    const src = normalize(sourceColumn)
    let best = { field: null as string | null, score: 0 }
    for (const f of CANONICAL_FIELDS) {
      const candidates = [normalize(f.label), normalize(f.key), ...f.synonyms.map(normalize)]
      for (const c of candidates) {
        const score = c === src ? 1 : similarity(src, c)
        if (score > best.score) best = { field: f.key, score }
      }
    }
    const status = best.score >= 0.8 ? 'auto' : best.score >= 0.5 ? 'suggest' : 'unmapped'
    return {
      sourceColumn,
      suggestedField: status === 'unmapped' ? null : best.field,
      confidence: Number(best.score.toFixed(2)),
      status,
    }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/import/mapping.test.ts`
Expected: PASS. Adjust the `synonyms` list in `fields.ts` if a real matrix column doesn't reach threshold (document the change in the commit).

- [ ] **Step 5: Commit**

```bash
git add lib/import lib/canonical
git commit -m 'feat(api): add column auto-mapping with synonyms and normalized levenshtein'
```

---

### Task 6: Import pipeline — row validation (`lib/import/validation.ts`)

**Files:**
- Create: `lib/import/coerce.ts`, `lib/import/validation.ts`, `lib/import/validation.test.ts`

**Interfaces:**
- Consumes: `CANONICAL_FIELDS`, `MappingProposal`.
- Produces: `validateRows(rows, mapping): { valid: BienInput[]; errors: RowError[] }`. `BienInput = Record<string, string | number | boolean | null>`. `RowError = { rowIndex: number; column: string; code: 'required' | 'type'; message: string }`.

- [ ] **Step 1: Write the failing test**

Create `lib/import/validation.test.ts`:

```ts
import { expect, test } from 'vitest'
import { validateRows } from './validation'
import type { MappingProposal } from './mapping'

const mapping: MappingProposal[] = [
  { sourceColumn: 'Inv', suggestedField: 'invariant_cadastral', confidence: 1, status: 'auto' },
  { sourceColumn: 'Rue', suggestedField: 'rue', confidence: 1, status: 'auto' },
  { sourceColumn: 'Ville', suggestedField: 'ville', confidence: 1, status: 'auto' },
  { sourceColumn: 'Nat', suggestedField: 'nature', confidence: 1, status: 'auto' },
  { sourceColumn: 'Cat', suggestedField: 'categorie', confidence: 1, status: 'auto' },
  { sourceColumn: 'Surf', suggestedField: 'surface_m2', confidence: 1, status: 'auto' },
  { sourceColumn: 'Eau', suggestedField: 'eau_courante', confidence: 1, status: 'auto' },
]
const base = { Inv: 'A1', Rue: 'X', Ville: 'Paris', Nat: 'appartement', Cat: '4', Surf: '45,5', Eau: 'Oui' }

test('coerces FR decimal and Oui/Non; flags missing required and bad type', () => {
  const { valid, errors } = validateRows(
    [base, { ...base, Surf: 'abc' }, { ...base, Ville: '' }],
    mapping,
  )
  expect(valid[0].surface_m2).toBe(45.5)
  expect(valid[0].eau_courante).toBe(true)
  expect(errors).toContainEqual(expect.objectContaining({ rowIndex: 1, column: 'surface_m2', code: 'type' }))
  expect(errors).toContainEqual(expect.objectContaining({ rowIndex: 2, column: 'ville', code: 'required' }))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/import/validation.test.ts`
Expected: FAIL — `validateRows` not defined.

- [ ] **Step 3: Implement coercion + validation**

`lib/import/coerce.ts`:

```ts
export function coerceNumber(raw: string): number | null {
  const v = raw.trim().replace(',', '.')
  if (v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN // NaN signals invalid
}
export function coerceBool(raw: string): boolean | null {
  const v = raw.trim().toLowerCase()
  if (v === '') return null
  if (['1', 'oui', 'true', 'o'].includes(v)) return true
  if (['0', 'non', 'false', 'n'].includes(v)) return false
  return null
}
```

`lib/import/validation.ts`: build a `byKey` map of `CANONICAL_FIELDS`; for each row, for each mapped column, coerce by field `type` (`number`/`int` via `coerceNumber`, `boolean` via `coerceBool`, else string). Push a `type` error when `coerceNumber` returns `NaN`. After building the row, push a `required` error for every required field that is null/empty. Rows without any error go to `valid`. **Never throw** — wrap per-row logic so one bad row cannot crash the batch.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/import/validation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/import
git commit -m 'feat(api): add row validation with tolerant coercion and structured errors'
```

---

### Task 7: Tax relief simulation (`lib/degrevement/compute.ts`)

**Files:**
- Create: `lib/degrevement/bareme.ts`, `lib/degrevement/compute.ts`, `lib/degrevement/compute.test.ts`

**Interfaces:**
- Produces: `computeDegrevement(bien: BienForEstimation, bareme: Bareme): EstimationResult` where `EstimationResult = { surfacePonderee: number; vlcRecalculee: number; degrevementEstime: number; params: Record<string, number> }`. `degrevementEstime` is clamped to `>= 0`.

- [ ] **Step 1: Write the failing test**

Create `lib/degrevement/compute.test.ts`:

```ts
import { expect, test } from 'vitest'
import { computeDegrevement } from './compute'
import { DEFAULT_BAREME } from './bareme'

const bien = {
  surface_m2: 50, ponderation_nature: 1, categorie: '4',
  coeff_entretien: 1, coeff_situation_particuliere: 1, coeff_situation_generale: 1,
  eau_courante: true, gaz: false, electricite: true, ascenseur: false,
  nb_wc: 1, nb_baignoires: 0, nb_douches: 1, nb_bidets: 0, nb_eviers: 1,
  vlc_reference: 1000, taux_imposition: 0.25,
}

test('computes weighted surface, VLC and clamps relief to >= 0', () => {
  const r = computeDegrevement(bien, DEFAULT_BAREME)
  expect(r.surfacePonderee).toBeGreaterThan(0)
  expect(r.vlcRecalculee).toBeGreaterThan(0)
  expect(r.degrevementEstime).toBeGreaterThanOrEqual(0)
})

test('parking weighting (0.6) yields smaller weighted surface than housing', () => {
  const housing = computeDegrevement({ ...bien, ponderation_nature: 1 }, DEFAULT_BAREME)
  const parking = computeDegrevement({ ...bien, ponderation_nature: 0.6 }, DEFAULT_BAREME)
  expect(parking.surfacePonderee).toBeLessThan(housing.surfacePonderee)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/degrevement/compute.test.ts`
Expected: FAIL — `computeDegrevement` not defined.

- [ ] **Step 3: Implement bareme + compute**

`lib/degrevement/bareme.ts` — **parametrable placeholder values; replace with the real legal barème provided by the business**:

```ts
export interface Bareme {
  tarifParCategorie: Record<string, number>
  equivalencesEquipements: { eau: number; gaz: number; electricite: number; ascenseur: number; parSanitaire: number }
}
export const DEFAULT_BAREME: Bareme = {
  tarifParCategorie: { '1': 12, '2': 10, '3': 8, '4': 6, '5': 5, '6': 4, '7': 3, '8': 2 },
  equivalencesEquipements: { eau: 4, gaz: 2, electricite: 2, ascenseur: 3, parSanitaire: 3 },
}
```

`lib/degrevement/compute.ts`:

```ts
import type { Bareme } from './bareme'

export interface BienForEstimation {
  surface_m2: number
  ponderation_nature: number
  categorie: string
  coeff_entretien: number | null
  coeff_situation_particuliere: number | null
  coeff_situation_generale: number | null
  eau_courante: boolean | null
  gaz: boolean | null
  electricite: boolean | null
  ascenseur: boolean | null
  nb_wc: number | null
  nb_baignoires: number | null
  nb_douches: number | null
  nb_bidets: number | null
  nb_eviers: number | null
  vlc_reference: number | null
  taux_imposition: number | null
}

export interface EstimationResult {
  surfacePonderee: number
  vlcRecalculee: number
  degrevementEstime: number
  params: Record<string, number>
}

const n = (v: number | null, d = 0): number => (v == null ? d : v)

export function computeDegrevement(bien: BienForEstimation, bareme: Bareme): EstimationResult {
  const e = bareme.equivalencesEquipements
  const sanitaires = n(bien.nb_wc) + n(bien.nb_baignoires) + n(bien.nb_douches) + n(bien.nb_bidets) + n(bien.nb_eviers)
  const equivalences =
    (bien.eau_courante ? e.eau : 0) + (bien.gaz ? e.gaz : 0) +
    (bien.electricite ? e.electricite : 0) + (bien.ascenseur ? e.ascenseur : 0) +
    sanitaires * e.parSanitaire

  const surfacePonderee = bien.surface_m2 * bien.ponderation_nature + equivalences
  const tarif = bareme.tarifParCategorie[bien.categorie] ?? 0
  const coeffs = n(bien.coeff_entretien, 1) * n(bien.coeff_situation_particuliere, 1) * n(bien.coeff_situation_generale, 1)
  const vlcRecalculee = surfacePonderee * tarif * coeffs

  const ecart = n(bien.vlc_reference) - vlcRecalculee
  const degrevementEstime = Math.max(0, ecart * n(bien.taux_imposition))

  return {
    surfacePonderee,
    vlcRecalculee,
    degrevementEstime,
    params: { tarif, equivalences, coeffs },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/degrevement/compute.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/degrevement
git commit -m 'feat(api): add tax relief simulation with parametrable barème'
```

---

### Task 8: Import wizard — route handler, UI & persistence

**Files:**
- Create: `app/api/lots/[lotId]/import/route.ts`
- Create: `app/(app)/lots/[lotId]/import/page.tsx`
- Create: `components/import/import-wizard.tsx`, `components/import/mapping-step.tsx`, `components/import/restitution-step.tsx`
- Create: `app/(app)/lots/[lotId]/import/actions.ts`

**Interfaces:**
- Consumes: `parseFile`, `autoMap`, `validateRows`, `getCurrentOrgId`.
- Produces: POST `/api/lots/:lotId/import` accepting a file → `{ headers, sampleRows, mapping }` (steps 1–2 server side). `confirmImport(lotId, mapping, rows)` Server Action persisting valid biens + an `import_batches` row, returning `{ rowsOk, rowsKo, errors }`.

- [ ] **Step 1: Upload + mapping route handler**

`route.ts`: read the uploaded file (`await req.formData()`), detect type from extension/mimetype, `parseFile`, `autoMap(headers)`, return JSON `{ headers, sampleRows: rows.slice(0, 5), mapping }`. Wrap in try/catch: parse failure → `400`, unexpected → `500` with a JSON message. Enforce a max file size (e.g. 5 MB) → `413`.

- [ ] **Step 2: Confirm-import server action**

`actions.ts`: `confirmImport` runs `validateRows(rows, mapping)`, computes `completeness` per bien (share of required fields present), inserts valid biens with `lot_id`/`org_id`, recomputes `lots.biens_count`, writes an `import_batches` row (`rows_total/ok/ko`, `mapping`, `errors`), `revalidatePath`. Validation errors are returned, not thrown (`422`-style payload).

- [ ] **Step 3: Wizard UI (4 steps)**

`import-wizard.tsx` (client): step state `upload | mapping | validation | restitution`.
- Upload: file dropzone → POST to route → receive headers/sample/mapping.
- `mapping-step.tsx`: table of `sourceColumn` → `<Select>` of canonical fields, prefilled from proposal, confidence badge (auto/suggest/unmapped colors), sample preview per column. User edits/confirms.
- Validation: call `confirmImport`; show counts ok/ko + per-row errors.
- `restitution-step.tsx`: table of imported biens, filled vs missing fields visually distinguished (muted cell + badge for missing).

`page.tsx` renders the wizard for the given `lotId`.

- [ ] **Step 4: Manual verification with the real matrix**

Copy `document_cadrage/Matrice (1).xlsx` somewhere accessible. Run `npm run dev`, open a lot → Importer → upload the matrix. Expected: headers detected, ≥3 columns auto-mapped correctly (Ville, Surface, Invariant), invalid rows reported without server crash, biens persisted and visible in the lot.
Run: `npm run build` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m 'feat(ui): add 4-step import wizard with mapping confirmation and persistence'
```

---

### Task 9: Bien detail, edit & relief recompute

**Files:**
- Create: `app/(app)/lots/[lotId]/biens/[bienId]/page.tsx`
- Create: `app/(app)/lots/[lotId]/biens/[bienId]/actions.ts`
- Create: `components/biens/bien-form.tsx`, `components/biens/degrevement-card.tsx`
- Create: `lib/validation/bien.ts`

**Interfaces:**
- Consumes: `computeDegrevement`, `DEFAULT_BAREME`, `CANONICAL_FIELDS`.
- Produces: `updateBien(bienId, input)` Server Action that persists fields, recomputes estimation via `computeDegrevement`, and stores `degrevement_estime`/`estimation_params`/`estimation_computed_at`.

- [ ] **Step 1: Bien Zod schema**

`lib/validation/bien.ts`: schema mirroring canonical fields (strings/numbers/bools, required matching dictionary), used by the edit form and `updateBien`.

- [ ] **Step 2: Update action with recompute**

`actions.ts`: `updateBien` validates input, maps the bien to `BienForEstimation` (pull `vlc_reference`/`taux_imposition` from form or org defaults), calls `computeDegrevement(bien, DEFAULT_BAREME)`, persists fields + estimation, `revalidatePath`.

- [ ] **Step 3: Detail page UI**

`page.tsx` fetches the bien, renders `degrevement-card.tsx` (montant en valeur — « l'euro d'abord », mis en avant) and `bien-form.tsx` (grouped sections: identité, surface/catégorie, équipements, coefficients) with a completeness indicator.

- [ ] **Step 4: Manual verification**

Run `npm run dev`. Open a bien, edit surface/equipment, save → `degrevement_estime` updates and the card reflects the new amount.
Run: `npm run build` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m 'feat(ui): add bien detail, edit form and live relief recompute'
```

---

### Task 10: Report lock, seed, advisors & polish

**Files:**
- Modify: `app/(app)/lots/[lotId]/page.tsx` (report button + lock)
- Create: `supabase/seed.sql` (demo org + lot from the matrix sample)
- Modify: empty/loading states across `(app)` routes

**Interfaces:**
- Consumes: lot/biens completeness.
- Produces: « Générer mon rapport » disabled until every bien in the lot is `complet`/`simule`; demo seed data.

- [ ] **Step 1: Report lock**

In the lot detail page, compute `allComplete = biens.every(b => b.completeness === 100)`. Render « Générer mon rapport » disabled with a tooltip listing remaining incomplete biens when `!allComplete`. (Actual report generation is out of MVP — the button gates only.)

- [ ] **Step 2: Empty & loading states**

Add `loading.tsx` skeletons and empty-state copy (French) for lots list, lot detail, and import restitution. Ensure mobile-first layout (`flex-col sm:flex-row`).

- [ ] **Step 3: Seed demo data**

Create `supabase/seed.sql` inserting a demo organization, one lot, and ~5 biens derived from the matrix sample (with a non-zero `degrevement_estime`). Document how to run it in the commit body.

- [ ] **Step 4: Final security pass**

Run Supabase MCP `get_advisors` (type `security`). Expected: no ERROR findings. Fix any RLS gap.

- [ ] **Step 5: Full verification**

Run: `npm run lint && npm run test && npm run build`
Expected: lint clean, all unit tests pass (parse, mapping, validation, degrevement), build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m 'feat(ui): add report lock, demo seed, empty states and final polish'
```

---

## Self-Review

**Spec coverage:**
- Auth + org → Task 1 (trigger) + Task 2. ✓
- Lot CRUD + list → Task 3. ✓
- Import pipeline Upload/Mapping/Validation/Restitution → Tasks 4, 5, 6, 8. ✓
- Canonical dictionary + synonyms + Levenshtein → Tasks 1, 5. ✓
- Tolerant coercion (1/0, Oui/Non, FR decimal, empty coeffs) → Task 6. ✓
- Bien consultation/edit + completeness → Task 9. ✓
- Dégrèvement simulation + parametrable barème + recompute → Tasks 7, 9. ✓
- RLS multi-tenant + advisors → Tasks 1, 10. ✓
- Report lock (« Générer mon rapport ») → Task 10. ✓
- Tests (≥5 mapping cases, validation, degrevement) → Tasks 5, 6, 7. ✓
- Mapping persistence (bonus 2A) → schema present (Task 1 `column_mappings`); wiring deferred (documented as bonus, not in MVP critical path).

**Out of MVP (correctly absent):** anomalies page, ERP reconciliation, async processing, PDF, payment.

**Type consistency:** `MappingProposal` (Task 5) consumed verbatim in Task 6 test and Task 8. `BienForEstimation`/`EstimationResult` (Task 7) consumed in Task 9. `CanonicalField` (Task 1) consumed in Tasks 5, 6, 9. Consistent.

**Placeholder scan:** Barème values in Task 7 are explicitly flagged as parametrable placeholders to be replaced with the real legal values — intentional and documented, not a plan gap.
