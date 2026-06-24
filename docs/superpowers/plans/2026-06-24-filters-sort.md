# Filters Functional + Sortable Column Headers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace non-functional string-based filters with structured field+value filters that actually filter table rows, and add alphanumeric column sorting by clicking headers in LotsPanel and BiensPanel.

**Architecture:** Introduce a shared `ActiveFilter` type in `lib/table/filters.ts` and a shared comparator in `lib/table/compare.ts`. `FilterChips` becomes a controlled component that renders a field selector + value input. Both panels wire up filter state, filter logic (AND with search), sort state, and sort logic (applied after filtering, before pageSize slice). `StatusBadge` exports a `statutLabel` helper consumed by BiensPanel for consistent filter+sort by label.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4, Lucide icons, Vitest.

## Global Constraints

- TypeScript strict: zero `any`, no unused imports/vars.
- No `console.log` in production code.
- French UI copy. English identifiers.
- No AI references anywhere (no co-authored-by, no comments).
- Toasts called OUTSIDE `setState` updater functions (no setState-in-render).
- Keep existing visual design — only minimal structural changes to markup.
- `npm run build` passes, `npm run lint` clean, `npm run test` passes.
- Single final commit: `feat(ui): make filters functional and add sortable column headers`
- Report saved to `.superpowers/sdd/filters-sort-report.md`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/table/filters.ts` | **Create** | `ActiveFilter` type + `FieldDef` type |
| `lib/table/compare.ts` | **Create** | `compareAlphaNum` comparator |
| `lib/table/compare.test.ts` | **Create** | Vitest unit tests for comparator |
| `components/dashboard/filter-chips.tsx` | **Modify** | New controlled API with field selector |
| `components/dashboard/status-badge.tsx` | **Modify** | Export `statutLabel` helper |
| `lib/mock/data.ts` | **Modify** | Remove `MOCK_FILTERS` export |
| `components/dashboard/lots-panel.tsx` | **Modify** | Wire filters + sort state |
| `components/dashboard/biens-panel.tsx` | **Modify** | Wire filters + sort state |
| `.superpowers/sdd/filters-sort-report.md` | **Create** | Report |

---

### Task 1: Shared types and comparator

**Files:**
- Create: `lib/table/filters.ts`
- Create: `lib/table/compare.ts`
- Create: `lib/table/compare.test.ts`

**Interfaces:**
- Produces:
  - `ActiveFilter { id: string; field: string; label: string; value: string }`
  - `FieldDef { key: string; label: string }`
  - `compareAlphaNum(a: string, b: string): number`

- [ ] **Step 1: Create `lib/table/filters.ts`**

```ts
export interface FieldDef {
  key: string;
  label: string;
}

export interface ActiveFilter {
  id: string;       // crypto.randomUUID()
  field: string;    // matches FieldDef.key
  label: string;    // human label, e.g. 'Ville'
  value: string;    // value the user typed
}
```

- [ ] **Step 2: Create `lib/table/compare.ts`**

```ts
export function compareAlphaNum(a: string, b: string): number {
  return a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' });
}
```

- [ ] **Step 3: Write failing tests in `lib/table/compare.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { compareAlphaNum } from './compare';

describe('compareAlphaNum', () => {
  it('sorts numeric-aware: 28m2 before 42m2', () => {
    expect(compareAlphaNum('28m2', '42m2')).toBeLessThan(0);
  });

  it('sorts alphabetical: Lyon before Paris', () => {
    expect(compareAlphaNum('Lyon', 'Paris')).toBeLessThan(0);
  });

  it('sorts numeric parts correctly: Étage 2 before Étage 10', () => {
    expect(compareAlphaNum('Étage 2', 'Étage 10')).toBeLessThan(0);
  });

  it('equal strings return 0', () => {
    expect(compareAlphaNum('Paris', 'Paris')).toBe(0);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail (compare.ts not yet wired)**

```powershell
cd "C:/Users/martin.DESKTOP-2EC8QE7/OneDrive - AD-Education/Documents/M2-DEV/ECV_Incub/orka-tax"
npx vitest run lib/table/compare.test.ts
```

Expected: PASS immediately because the file is already created (Step 2). If any test fails, fix `compare.ts`.

- [ ] **Step 5: Run full test suite**

```powershell
npm run test
```

Expected: all existing tests pass + 4 new compare tests pass.

---

### Task 2: Export `statutLabel` from `status-badge.tsx`

**Files:**
- Modify: `components/dashboard/status-badge.tsx`

**Interfaces:**
- Produces: `statutLabel(statut: BienStatut): string` — exported named function
- The default export `StatusBadge` is unchanged

- [ ] **Step 1: Read the current file**

Already read above. Current content at `components/dashboard/status-badge.tsx` lines 1-20.

- [ ] **Step 2: Add export for `STATUT_CONFIG` lookup helper**

Replace the file with:

```tsx
import type { BienStatut } from '@/lib/mock/data';

const STATUT_CONFIG: Record<BienStatut, { label: string; className: string }> = {
  importe: { label: 'Importé', className: 'text-ui-text-muted' },
  rapprochement: { label: 'Rapprochement en cours', className: 'bg-info/10 text-info' },
  resolu: { label: 'Résolu', className: 'bg-success/10 text-success' },
  analyse: { label: 'En analyse', className: 'bg-info/10 text-info' },
  anomalie: { label: 'Anomalie détectée', className: 'bg-warning/10 text-warning' },
  reclamation: { label: 'Réclamation', className: 'bg-error/10 text-error' },
  remboursement: { label: 'Remboursement obtenu', className: 'bg-info/10 text-info' },
};

export function statutLabel(statut: BienStatut): string {
  return STATUT_CONFIG[statut].label;
}

export default function StatusBadge({ statut }: { statut: BienStatut }) {
  const { label, className } = STATUT_CONFIG[statut];
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${className}`}>
      {label}
    </span>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles (quick check)**

```powershell
npx tsc --noEmit --project tsconfig.json
```

Expected: no errors on this file.

---

### Task 3: Remove `MOCK_FILTERS` from `lib/mock/data.ts`

**Files:**
- Modify: `lib/mock/data.ts`

**Note:** `MOCK_FILTERS` is imported by `lots-panel.tsx` and `biens-panel.tsx`. After this task both panels will no longer import it (they'll be updated in Tasks 4-5). Do this task AFTER Tasks 4 and 5 are written (or remove the import at the same time as patching each panel).

**Strategy:** Remove the export from `data.ts` and remove the import in both panels simultaneously. This is done in one edit pass — see Tasks 4 & 5. Here we note: line 55 of `data.ts` is the only location:
```ts
export const MOCK_FILTERS = ['Nuxt', 'Vue', 'Vite'];
```

Remove that line. It is not referenced by anything other than the two panels (confirmed by grep in plan step).

- [ ] **Step 1: Grep to confirm no other consumers**

```powershell
grep -r "MOCK_FILTERS" "C:/Users/martin.DESKTOP-2EC8QE7/OneDrive - AD-Education/Documents/M2-DEV/ECV_Incub/orka-tax/components" --include="*.tsx"
grep -r "MOCK_FILTERS" "C:/Users/martin.DESKTOP-2EC8QE7/OneDrive - AD-Education/Documents/M2-DEV/ECV_Incub/orka-tax/lib" --include="*.ts"
grep -r "MOCK_FILTERS" "C:/Users/martin.DESKTOP-2EC8QE7/OneDrive - AD-Education/Documents/M2-DEV/ECV_Incub/orka-tax/app" --include="*.tsx" 2>/dev/null
```

Expected: only `lots-panel.tsx` and `biens-panel.tsx` reference `MOCK_FILTERS`.

- [ ] **Step 2: Remove line 55 from `lib/mock/data.ts`**

Using Edit tool: remove `export const MOCK_FILTERS = ['Nuxt', 'Vue', 'Vite'];`

---

### Task 4: Rewrite `filter-chips.tsx` with new controlled API

**Files:**
- Modify: `components/dashboard/filter-chips.tsx`

**Interfaces:**
- Consumes:
  - `ActiveFilter` from `@/lib/table/filters`
  - `FieldDef` from `@/lib/table/filters`
- Produces: default export `FilterChips` with new props (replaces old props entirely)

**Props signature:**
```ts
interface FilterChipsProps {
  fields: FieldDef[];
  filters: ActiveFilter[];
  onAdd: (field: FieldDef, value: string) => void;
  onRemove: (id: string) => void;
  onReset: () => void;
}
```

**Behavior:**
- Each active filter rendered as chip: `{label}: {value}` (e.g. "Ville: Paris") + X button calling `onRemove(filter.id)`.
- "+ ajouter un filtre" button → shows inline composer (field `<select>` + value `<input>` + Check + X buttons) in the same row.
- On validate (Check click or Enter): call `onAdd(selectedField, value.trim())` then reset composer state.
- Escape key on input cancels the composer.
- `onBlur` on input is removed (was causing issues in the original; use explicit buttons instead).
- "Réinitialiser" calls `onReset()`.

- [ ] **Step 1: Write the new `filter-chips.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import type { ActiveFilter, FieldDef } from '@/lib/table/filters';

interface FilterChipsProps {
  fields: FieldDef[];
  filters: ActiveFilter[];
  onAdd: (field: FieldDef, value: string) => void;
  onRemove: (id: string) => void;
  onReset: () => void;
}

export default function FilterChips({ fields, filters, onAdd, onRemove, onReset }: FilterChipsProps) {
  const [adding, setAdding] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>(fields[0]?.key ?? '');
  const [value, setValue] = useState('');

  const cancel = () => {
    setAdding(false);
    setValue('');
    setSelectedKey(fields[0]?.key ?? '');
  };

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    const field = fields.find((f) => f.key === selectedKey);
    if (!field) return;
    onAdd(field, v);
    cancel();
  };

  return (
    <div className="px-5 py-3 flex items-center gap-2 flex-wrap text-sm border-b border-ui-border">
      {filters.map((filter) => (
        <span
          key={filter.id}
          className="bg-ui-bg-elevated border border-ui-border rounded-md px-2 py-1 text-xs flex items-center gap-1 text-ui-text"
        >
          <span className="font-medium">{filter.label}</span>:&nbsp;{filter.value}
          <button
            onClick={() => onRemove(filter.id)}
            className="text-ui-text-muted hover:text-ui-text transition-colors"
            aria-label={`Retirer le filtre ${filter.label}: ${filter.value}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}

      {adding ? (
        <span className="flex items-center gap-1">
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="border border-ui-border rounded-md px-2 py-1 text-xs text-ui-text focus:outline-none focus:border-ui-border-accented"
          >
            {fields.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') cancel();
            }}
            placeholder="Valeur"
            className="border border-ui-border rounded-md px-2 py-1 text-xs w-28 text-ui-text placeholder:text-ui-text-dimmed focus:outline-none focus:border-ui-border-accented"
          />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={submit}
            className="text-success hover:opacity-70 transition-opacity"
            aria-label="Valider le filtre"
          >
            <Check size={14} />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={cancel}
            className="text-ui-text-muted hover:text-ui-text transition-colors"
            aria-label="Annuler le filtre"
          >
            <X size={14} />
          </button>
        </span>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-ui-text-muted flex items-center gap-1 text-xs hover:text-ui-text transition-colors"
        >
          <Plus size={12} />
          ajouter un filtre
        </button>
      )}

      <span className="text-ui-border mx-1">|</span>
      <button
        onClick={onReset}
        className="underline text-ui-text-muted text-xs hover:text-ui-text transition-colors"
      >
        Réinitialiser
      </button>
    </div>
  );
}
```

---

### Task 5: Update `lots-panel.tsx` — filters + sorting

**Files:**
- Modify: `components/dashboard/lots-panel.tsx`

**Interfaces:**
- Consumes:
  - `ActiveFilter`, `FieldDef` from `@/lib/table/filters`
  - `compareAlphaNum` from `@/lib/table/compare`
  - New `FilterChips` props API (fields, filters, onAdd, onRemove, onReset)
- Old import `MOCK_FILTERS` removed; old `filters: string[]` state replaced

**Sort columns:** `name` (Lots), `address` (Adresse), `city` (Ville). "Dégrèvement estimés", checkbox, and action columns are non-sortable.

**Filter fields:**
```ts
const LOT_FIELDS: FieldDef[] = [
  { key: 'name',    label: 'Lot' },
  { key: 'address', label: 'Adresse' },
  { key: 'city',    label: 'Ville' },
];
```

**Accessors** (used for both filtering AND sorting):
```ts
const LOT_ACCESSORS: Record<string, (l: Lot) => string> = {
  name:    (l) => l.name,
  address: (l) => l.address,
  city:    (l) => l.city,
};
```

**Sort state:** `const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);`

**Sort cycle:** clicking a header:
- if current sort.key !== this key → set `{ key, dir: 'asc' }`
- if `dir === 'asc'` → set `{ key, dir: 'desc' }`
- if `dir === 'desc'` → set `null` (unsorted)

**Icon logic:** unsorted → `ArrowDownUp` (muted, `text-white/60`), asc → `ArrowUp` (accent, `text-vert-400`), desc → `ArrowDown` (accent, `text-vert-400`). Import `ArrowUp`, `ArrowDown` from lucide.

**Pipeline:** `filtered` = search AND all ActiveFilters, then `sorted` = filtered + optional sort, then `visible = sorted.slice(0, pageSize)`.

- [ ] **Step 1: Write updated `lots-panel.tsx`**

Full replacement (read current file first to ensure Edit tool can apply). Key changes only listed here — implement ALL original logic + new parts:

1. **Remove** `MOCK_FILTERS` import from `@/lib/mock/data` import line.
2. **Add** imports: `ArrowUp, ArrowDown` from `lucide-react`; `type ActiveFilter, type FieldDef` from `@/lib/table/filters`; `compareAlphaNum` from `@/lib/table/compare`.
3. **Add** `LOT_FIELDS` and `LOT_ACCESSORS` constants before the component.
4. **Replace** `filters` state: `const [filters, setFilters] = useState<ActiveFilter[]>([]);`
5. **Add** `sort` state: `const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);`
6. **Replace** `filtered` useMemo to also apply `filters`:
```ts
const filtered = useMemo(() => {
  const q = search.toLowerCase();
  return lots.filter((l) => {
    const matchSearch =
      l.name.toLowerCase().includes(q) ||
      l.address.toLowerCase().includes(q) ||
      l.city.toLowerCase().includes(q);
    const matchFilters = filters.every((f) =>
      LOT_ACCESSORS[f.field]?.(l).toLowerCase().includes(f.value.toLowerCase()) ?? true
    );
    return matchSearch && matchFilters;
  });
}, [lots, search, filters]);
```
7. **Add** `sorted` derivation (after `filtered`):
```ts
const sorted = useMemo(() => {
  if (!sort) return filtered;
  const accessor = LOT_ACCESSORS[sort.key];
  if (!accessor) return filtered;
  return [...filtered].sort((a, b) => {
    const cmp = compareAlphaNum(accessor(a), accessor(b));
    return sort.dir === 'asc' ? cmp : -cmp;
  });
}, [filtered, sort]);
```
8. **Replace** `visible`: `const visible = sorted.slice(0, pageSize);`
9. **Replace** `handleRemoveFilter`: `const handleRemoveFilter = useCallback((id: string) => { setFilters((prev) => prev.filter((f) => f.id !== id)); }, []);`
10. **Replace** `handleResetFilters`: `const handleResetFilters = useCallback(() => setFilters([]), []);`
11. **Replace** `handleAddFilter`:
```ts
const handleAddFilter = useCallback((field: FieldDef, value: string) => {
  const isDuplicate = filters.some((f) => f.field === field.key && f.value.toLowerCase() === value.toLowerCase());
  if (isDuplicate) {
    toast('Ce filtre existe déjà', 'error');
    return;
  }
  setFilters((prev) => [...prev, { id: crypto.randomUUID(), field: field.key, label: field.label, value }]);
  toast('Filtre ajouté', 'success');
}, [filters, toast]);
```
12. **Add** `handleSort`:
```ts
const handleSort = useCallback((key: string) => {
  setSort((prev) => {
    if (!prev || prev.key !== key) return { key, dir: 'asc' };
    if (prev.dir === 'asc') return { key, dir: 'desc' };
    return null;
  });
}, []);
```
13. **Update** `FilterChips` usage:
```tsx
<FilterChips
  fields={LOT_FIELDS}
  filters={filters}
  onAdd={handleAddFilter}
  onRemove={handleRemoveFilter}
  onReset={handleResetFilters}
/>
```
14. **Replace** the 3 sortable `<th>` (Lots, Adresse, Ville) with clickable buttons. For each, use a helper function or inline:
```tsx
{/* Helper for sortable header — inline for each column */}
<th className="text-left px-4 py-3 font-medium">
  <button
    onClick={() => handleSort('name')}
    className="flex items-center gap-1 w-full"
  >
    Lots
    {sort?.key === 'name' ? (
      sort.dir === 'asc'
        ? <ArrowUp size={14} className="text-vert-400" />
        : <ArrowDown size={14} className="text-vert-400" />
    ) : (
      <ArrowDownUp size={14} className="text-white/60" />
    )}
  </button>
</th>
<th className="text-left px-4 py-3 font-medium">
  <button
    onClick={() => handleSort('address')}
    className="flex items-center gap-1 w-full"
  >
    Adresse
    {sort?.key === 'address' ? (
      sort.dir === 'asc'
        ? <ArrowUp size={14} className="text-vert-400" />
        : <ArrowDown size={14} className="text-vert-400" />
    ) : (
      <ArrowDownUp size={14} className="text-white/60" />
    )}
  </button>
</th>
<th className="text-left px-4 py-3 font-medium">
  <button
    onClick={() => handleSort('city')}
    className="flex items-center gap-1 w-full"
  >
    Ville
    {sort?.key === 'city' ? (
      sort.dir === 'asc'
        ? <ArrowUp size={14} className="text-vert-400" />
        : <ArrowDown size={14} className="text-vert-400" />
    ) : (
      <ArrowDownUp size={14} className="text-white/60" />
    )}
  </button>
</th>
```
15. **"Dégrèvement estimés"** `<th>` remains as-is (no button wrapper).

---

### Task 6: Update `biens-panel.tsx` — filters + sorting

**Files:**
- Modify: `components/dashboard/biens-panel.tsx`

**Interfaces:**
- Consumes:
  - `ActiveFilter`, `FieldDef` from `@/lib/table/filters`
  - `compareAlphaNum` from `@/lib/table/compare`
  - `statutLabel` from `@/components/dashboard/status-badge`
  - New `FilterChips` props API

**Sort columns:** `type` (Vos biens), `reference` (ID), `surface` (Surfaces), `etage` (Étage), `statut` (Statut). "Dégrèvement estimés", checkbox, and actions are non-sortable.

**Filter fields:**
```ts
const BIEN_FIELDS: FieldDef[] = [
  { key: 'type',      label: 'Type' },
  { key: 'reference', label: 'ID' },
  { key: 'surface',   label: 'Surface' },
  { key: 'etage',     label: 'Étage' },
  { key: 'statut',    label: 'Statut' },
];
```

**Accessors:**
```ts
const BIEN_ACCESSORS: Record<string, (b: Bien) => string> = {
  type:      (b) => b.type,
  reference: (b) => b.reference,
  surface:   (b) => b.surface,
  etage:     (b) => b.etage,
  statut:    (b) => statutLabel(b.statut),
};
```

**Note:** Remove `MOCK_FILTERS` from import, remove `COLUMNS` array (it will be replaced by explicit sortable `<th>` elements).

- [ ] **Step 1: Write updated `biens-panel.tsx`**

Key changes (all others stay identical):

1. **Remove** `MOCK_FILTERS` from `@/lib/mock/data` import. Keep `MOCK_BIENS, type Bien, type BienType`.
2. **Add** imports: `ArrowUp, ArrowDown` from `lucide-react`; `type ActiveFilter, type FieldDef` from `@/lib/table/filters`; `compareAlphaNum` from `@/lib/table/compare`; `{ statutLabel }` from `@/components/dashboard/status-badge`.
3. **Remove** `const COLUMNS = [...]` line.
4. **Add** `BIEN_FIELDS` and `BIEN_ACCESSORS` constants before the component.
5. **Replace** `filters` state: `const [filters, setFilters] = useState<ActiveFilter[]>([]);`
6. **Add** `sort` state: `const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);`
7. **Replace** `filtered` useMemo to use accessors + active filters:
```ts
const filtered = useMemo(() => {
  const q = search.toLowerCase();
  return biens.filter((b) => {
    const matchSearch =
      b.type.toLowerCase().includes(q) ||
      b.reference.toLowerCase().includes(q);
    const matchFilters = filters.every((f) =>
      BIEN_ACCESSORS[f.field]?.(b).toLowerCase().includes(f.value.toLowerCase()) ?? true
    );
    return matchSearch && matchFilters;
  });
}, [biens, search, filters]);
```
8. **Add** `sorted` derivation:
```ts
const sorted = useMemo(() => {
  if (!sort) return filtered;
  const accessor = BIEN_ACCESSORS[sort.key];
  if (!accessor) return filtered;
  return [...filtered].sort((a, b) => {
    const cmp = compareAlphaNum(accessor(a), accessor(b));
    return sort.dir === 'asc' ? cmp : -cmp;
  });
}, [filtered, sort]);
```
9. **Replace** `visible`: `const visible = sorted.slice(0, pageSize);`
10. **Replace** filter handlers analogously to LotsPanel (same pattern, same types).
11. **Add** `handleSort` (same pattern as LotsPanel).
12. **Update** `FilterChips` usage:
```tsx
<FilterChips
  fields={BIEN_FIELDS}
  filters={filters}
  onAdd={handleAddFilter}
  onRemove={handleRemoveFilter}
  onReset={handleResetFilters}
/>
```
13. **Replace** the `{COLUMNS.map(...)}` thead row with explicit `<th>` elements for each column. Sortable columns get button wrappers; "Dégrèvement estimés" stays static:

```tsx
<tr className="bg-cyprus-900 text-white text-sm">
  <th className="px-4 py-3 w-10">
    <input type="checkbox" className="rounded" aria-label="Tout sélectionner" checked={allVisibleSelected} onChange={toggleAll} />
  </th>
  {/* Vos biens — sortable */}
  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
    <button onClick={() => handleSort('type')} className="flex items-center gap-1 w-full">
      Vos biens
      {sort?.key === 'type' ? (sort.dir === 'asc' ? <ArrowUp size={14} className="text-vert-400" /> : <ArrowDown size={14} className="text-vert-400" />) : <ArrowDownUp size={14} className="text-white/60" />}
    </button>
  </th>
  {/* ID — sortable */}
  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
    <button onClick={() => handleSort('reference')} className="flex items-center gap-1 w-full">
      ID
      {sort?.key === 'reference' ? (sort.dir === 'asc' ? <ArrowUp size={14} className="text-vert-400" /> : <ArrowDown size={14} className="text-vert-400" />) : <ArrowDownUp size={14} className="text-white/60" />}
    </button>
  </th>
  {/* Surfaces — sortable */}
  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
    <button onClick={() => handleSort('surface')} className="flex items-center gap-1 w-full">
      Surfaces
      {sort?.key === 'surface' ? (sort.dir === 'asc' ? <ArrowUp size={14} className="text-vert-400" /> : <ArrowDown size={14} className="text-vert-400" />) : <ArrowDownUp size={14} className="text-white/60" />}
    </button>
  </th>
  {/* Étage — sortable */}
  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
    <button onClick={() => handleSort('etage')} className="flex items-center gap-1 w-full">
      Étage
      {sort?.key === 'etage' ? (sort.dir === 'asc' ? <ArrowUp size={14} className="text-vert-400" /> : <ArrowDown size={14} className="text-vert-400" />) : <ArrowDownUp size={14} className="text-white/60" />}
    </button>
  </th>
  {/* Dégrèvement estimés — NOT sortable */}
  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Dégrèvement estimés</th>
  {/* Statut — sortable */}
  <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
    <button onClick={() => handleSort('statut')} className="flex items-center gap-1 w-full">
      Statut
      {sort?.key === 'statut' ? (sort.dir === 'asc' ? <ArrowUp size={14} className="text-vert-400" /> : <ArrowDown size={14} className="text-vert-400" />) : <ArrowDownUp size={14} className="text-white/60" />}
    </button>
  </th>
  <th className="px-4 py-3 w-24"></th>
</tr>
```

---

### Task 7: Build, lint, test verification

**Files:** No changes — verification only.

- [ ] **Step 1: Run TypeScript check**

```powershell
cd "C:/Users/martin.DESKTOP-2EC8QE7/OneDrive - AD-Education/Documents/M2-DEV/ECV_Incub/orka-tax"
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Run lint**

```powershell
npm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Run tests**

```powershell
npm run test
```

Expected: all tests pass (previous 7 test files + new `lib/table/compare.test.ts` = 8 files, 4+ new tests).

- [ ] **Step 4: Run build**

```powershell
npm run build
```

Expected: Build succeeds with no errors.

---

### Task 8: Write report and commit

**Files:**
- Create: `.superpowers/sdd/filters-sort-report.md`

- [ ] **Step 1: Write the report**

Content must include: files changed, filter/sort model, how filtering+sorting+search+pagination compose, build/lint/test output, any deviations.

- [ ] **Step 2: Stage and commit**

```powershell
git add lib/table/filters.ts lib/table/compare.ts lib/table/compare.test.ts
git add components/dashboard/filter-chips.tsx components/dashboard/status-badge.tsx
git add lib/mock/data.ts
git add components/dashboard/lots-panel.tsx components/dashboard/biens-panel.tsx
git add .superpowers/sdd/filters-sort-report.md
git status
git commit -m 'feat(ui): make filters functional and add sortable column headers'
```

Expected: clean commit, no untracked or unstaged changes left.

---

## Self-Review Checklist

- [x] `ActiveFilter` type defined in Task 1 and used consistently in Tasks 4, 5, 6.
- [x] `FieldDef` type defined in Task 1 and used in FilterChips, LotsPanel, BiensPanel.
- [x] `compareAlphaNum` defined in Task 1, tested in Task 1, used in Tasks 5 & 6.
- [x] `statutLabel` exported in Task 2, imported in Task 6 BIEN_ACCESSORS.
- [x] `MOCK_FILTERS` removal in Task 3 — both panel imports updated in Tasks 5 & 6.
- [x] Toast calls are OUTSIDE setState updaters in both panels (called before `setFilters`).
- [x] Sort cycles: unsorted → asc → desc → unsorted. Covered in Tasks 5 & 6 `handleSort`.
- [x] Sort applied after filter, before pageSize slice (`sorted` derived from `filtered`, `visible = sorted.slice(0, pageSize)`).
- [x] Non-sortable columns (Dégrèvement estimés, checkbox, actions) have no button wrappers.
- [x] Vitest config includes `lib/**/*.test.ts` — new `lib/table/compare.test.ts` is included automatically.
- [x] `app/page.tsx` is not touched.
- [x] No `any`, no unused imports.
