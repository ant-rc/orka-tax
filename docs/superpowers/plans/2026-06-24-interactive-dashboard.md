# Interactive Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire all static buttons to interactive actions across the ORKA/Kadastra dashboard using mock data and local state (no database, no new npm deps).

**Architecture:** Add a zero-dependency toast+modal system via React context (`ToastProvider`) and a controlled `Modal` component. Lift panel state into `LotsPanel` and `BiensPanel` (both become `'use client'`). Controlled props flow down to `PanelToolbar`, `FilterChips`, and the new `PageSizeSelect`. Each panel owns its own `lots`/`biens` array in state, enabling full CRUD-like operations via `useState`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4, lucide-react (already installed).

## Global Constraints

- TypeScript strict — zero `any`, no unused imports/vars
- No new npm dependencies — all UI built from scratch
- French UI copy, English identifiers
- No references to any AI assistant in code, commits, or comments
- `'use client'` only where state/handlers are needed
- Keep existing visual design pixel-identical (exception: enable "Générer mon rapport" button)
- Every icon-only button must have an `aria-label`
- `crypto.randomUUID()` for generated IDs
- `npm run build` must pass, `npm run lint` must be clean
- Async params on dynamic routes: `params: Promise<{ lotId: string }>` pattern

---

## File Map

### New files to create
- `components/ui/toast.tsx` — `ToastProvider`, `useToast`, `Toaster` component
- `components/ui/modal.tsx` — `Modal` component
- `app/providers.tsx` — wraps children with `ToastProvider` + renders `<Toaster />`
- `app/(app)/lots/[lotId]/biens/[bienId]/page.tsx` — bien detail placeholder page

### Files to modify
- `app/layout.tsx` — wrap `{children}` with `<Providers>`
- `components/dashboard/panel-toolbar.tsx` — make controlled (`'use client'`), accept callbacks
- `components/dashboard/filter-chips.tsx` — make controlled (`'use client'`), accept callbacks
- `components/dashboard/lots-panel.tsx` — full client component with local state
- `components/dashboard/biens-panel.tsx` — full client component with local state, accept `lotId` prop
- `app/(app)/lots/[lotId]/page.tsx` — async params, pass `lotId` to `BiensPanel`
- `components/dashboard/sidebar.tsx` — `'use client'`, `usePathname` active state, nav links
- `components/dashboard/header.tsx` — `'use client'`, toast on "Obtenir des crédits"
- `components/dashboard/bottom-bar.tsx` — `'use client'`, toast on "Enregistrer", enable "Générer mon rapport"
- `components/dashboard/suivi-card.tsx` — `'use client'`, toast on Eye + Download

---

### Task 1: Toast system

**Files:**
- Create: `components/ui/toast.tsx`

**Interfaces:**
- Produces: `ToastProvider` (React context provider), `useToast(): (message: string, variant?: 'default' | 'success' | 'error') => void`, `Toaster` (renders toast stack)

- [ ] **Step 1: Create `components/ui/toast.tsx`**

```tsx
'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

type ToastVariant = 'default' | 'success' | 'error';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

type ToastFn = (message: string, variant?: ToastVariant) => void;

const ToastContext = createContext<ToastFn | null>(null);

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 3000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const borderColor =
    toast.variant === 'success' ? 'border-l-4 border-l-success' :
    toast.variant === 'error' ? 'border-l-4 border-l-error' :
    '';

  return (
    <div
      className={`bg-white border border-ui-border rounded-md shadow-lg px-4 py-3 text-sm flex items-start gap-3 min-w-[260px] max-w-sm ${borderColor}`}
    >
      {toast.variant === 'success' && <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />}
      {toast.variant === 'error' && <AlertCircle size={16} className="text-error shrink-0 mt-0.5" />}
      <span className="flex-1 text-ui-text">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-ui-text-muted hover:text-ui-text transition-colors shrink-0"
        aria-label="Fermer la notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastFn>((message, variant = 'default') => {
    setToasts((prev) => [...prev, { id: crypto.randomUUID(), message, variant }]);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
```

- [ ] **Step 2: Verify TypeScript types are valid**

No test runner needed — this step is verified by the build in Task 9. Just ensure no red squiggles if IDE available.

---

### Task 2: Modal component

**Files:**
- Create: `components/ui/modal.tsx`

**Interfaces:**
- Produces: `Modal` component with props `{ open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }`

- [ ] **Step 1: Create `components/ui/modal.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border">
          <h2 className="text-base font-semibold text-ui-text-highlighted">{title}</h2>
          <button
            onClick={onClose}
            className="text-ui-text-muted hover:text-ui-text transition-colors"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-4">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-ui-border flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### Task 3: Providers + root layout wiring

**Files:**
- Create: `app/providers.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `ToastProvider` from `components/ui/toast.tsx`
- Produces: `<Providers>` wrapper available in root layout

- [ ] **Step 1: Create `app/providers.tsx`**

```tsx
'use client';

import { ToastProvider } from '@/components/ui/toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
```

- [ ] **Step 2: Modify `app/layout.tsx` — wrap children with Providers**

Current file at `app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Kadastra",
  description: "Vérification de la taxe foncière à l'échelle d'un portefeuille",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
```

Change the body line to:
```tsx
import Providers from "./providers";
// ...
      <body className="min-h-full"><Providers>{children}</Providers></body>
```

Full updated file:
```tsx
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Kadastra",
  description: "Vérification de la taxe foncière à l'échelle d'un portefeuille",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

### Task 4: Make `PanelToolbar` and `FilterChips` controlled

**Files:**
- Modify: `components/dashboard/panel-toolbar.tsx`
- Modify: `components/dashboard/filter-chips.tsx`

**Interfaces:**
- `PanelToolbar` props: `{ primaryLabel: string; searchValue: string; onSearchChange: (v: string) => void; onPrimary: () => void; onImport: () => void; }`
- `FilterChips` props: `{ filters: string[]; onRemove: (f: string) => void; onReset: () => void; onAdd: () => void; }`

- [ ] **Step 1: Rewrite `components/dashboard/panel-toolbar.tsx`**

```tsx
'use client';

import { Search, Download, Plus } from 'lucide-react';
import { MOCK_COUNTS } from '@/lib/mock/data';

interface PanelToolbarProps {
  primaryLabel: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  onPrimary: () => void;
  onImport: () => void;
}

export default function PanelToolbar({
  primaryLabel,
  searchValue,
  onSearchChange,
  onPrimary,
  onImport,
}: PanelToolbarProps) {
  return (
    <div className="p-5 flex items-center justify-between gap-4 flex-wrap border-b border-ui-border">
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold text-ui-text-highlighted">Configurations de vos biens</span>
        <span className="bg-vert-200 text-vert-900 rounded-md px-2 py-0.5 text-sm font-medium">
          {MOCK_COUNTS.configured} /{MOCK_COUNTS.total}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-text-dimmed" />
          <input
            type="text"
            placeholder="Chercher"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="border border-ui-border rounded-md pl-8 pr-3 py-2 text-sm w-full sm:w-60 text-ui-text placeholder:text-ui-text-dimmed focus:outline-none focus:border-ui-border-accented"
          />
        </div>
        <button
          onClick={onImport}
          className="border border-ui-border rounded-md px-3 py-2 text-sm flex items-center gap-1.5 text-ui-text hover:bg-ui-bg-elevated transition-colors"
        >
          <Download size={14} />
          Importer
        </button>
        <button
          onClick={onPrimary}
          className="bg-vert-400 text-vert-900 rounded-md px-3 py-2 text-sm font-medium flex items-center gap-1.5 hover:bg-vert-300 transition-colors"
        >
          <Plus size={14} />
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `components/dashboard/filter-chips.tsx`**

```tsx
'use client';

import { Plus, X } from 'lucide-react';

interface FilterChipsProps {
  filters: string[];
  onRemove: (f: string) => void;
  onReset: () => void;
  onAdd: () => void;
}

export default function FilterChips({ filters, onRemove, onReset, onAdd }: FilterChipsProps) {
  return (
    <div className="px-5 py-3 flex items-center gap-2 flex-wrap text-sm border-b border-ui-border">
      {filters.map((filter) => (
        <span
          key={filter}
          className="bg-ui-bg-elevated border border-ui-border rounded-md px-2 py-1 text-xs flex items-center gap-1 text-ui-text"
        >
          {filter}
          <button
            onClick={() => onRemove(filter)}
            className="text-ui-text-muted hover:text-ui-text transition-colors"
            aria-label={`Retirer ${filter}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <button
        onClick={onAdd}
        className="text-ui-text-muted flex items-center gap-1 text-xs hover:text-ui-text transition-colors"
      >
        <Plus size={12} />
        ajouter un filtre
      </button>
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

### Task 5: Interactive `LotsPanel`

**Files:**
- Modify: `components/dashboard/lots-panel.tsx`

**Interfaces:**
- Consumes: `PanelToolbar` (controlled), `FilterChips` (controlled), `Modal`, `useToast`
- Consumes types from `@/lib/mock/data`: `Lot`, `MOCK_LOTS`, `MOCK_FILTERS`

- [ ] **Step 1: Rewrite `components/dashboard/lots-panel.tsx`**

```tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ArrowDownUp, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { MOCK_LOTS, MOCK_FILTERS, type Lot } from '@/lib/mock/data';
import PanelToolbar from '@/components/dashboard/panel-toolbar';
import FilterChips from '@/components/dashboard/filter-chips';
import Modal from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

export default function LotsPanel() {
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<string[]>(MOCK_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(10);
  const [lots, setLots] = useState<Lot[]>(MOCK_LOTS);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newRef, setNewRef] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return lots.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q)
    );
  }, [lots, search]);

  const visible = filtered.slice(0, pageSize);

  const allVisibleSelected = visible.length > 0 && visible.every((l) => selected.has(l.id));

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visible.forEach((l) => next.delete(l.id));
      } else {
        visible.forEach((l) => next.add(l.id));
      }
      return next;
    });
  }, [allVisibleSelected, visible]);

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleRemoveFilter = useCallback((f: string) => {
    setFilters((prev) => prev.filter((x) => x !== f));
  }, []);

  const handleResetFilters = useCallback(() => setFilters([]), []);

  const handleAddFilter = useCallback(() => {
    const n = filters.length + 1;
    setFilters((prev) => [...prev, `Filtre ${n}`]);
    toast('Filtre ajouté');
  }, [filters.length, toast]);

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    const lot: Lot = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      address: newRef.trim() || '',
      city: '',
      status: 'en_attente',
    };
    setLots((prev) => [lot, ...prev]);
    setCreateOpen(false);
    setNewName('');
    setNewRef('');
    toast('Lot créé', 'success');
  }, [newName, newRef, toast]);

  const handleImportConfirm = useCallback(() => {
    setImportOpen(false);
    toast('Import simulé — pipeline à brancher');
  }, [toast]);

  return (
    <div className="bg-white rounded-lg border border-ui-border shadow-sm overflow-hidden flex flex-col">
      <PanelToolbar
        primaryLabel="Créer un lot"
        searchValue={search}
        onSearchChange={setSearch}
        onPrimary={() => setCreateOpen(true)}
        onImport={() => setImportOpen(true)}
      />
      <FilterChips
        filters={filters}
        onRemove={handleRemoveFilter}
        onReset={handleResetFilters}
        onAdd={handleAddFilter}
      />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-cyprus-900 text-white text-sm">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  className="rounded"
                  aria-label="Tout sélectionner"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                />
              </th>
              <th className="text-left px-4 py-3 font-medium">
                <span className="flex items-center gap-1">
                  Lots <ArrowDownUp size={14} className="text-white/60" />
                </span>
              </th>
              <th className="text-left px-4 py-3 font-medium">
                <span className="flex items-center gap-1">
                  Adresse <ArrowDownUp size={14} className="text-white/60" />
                </span>
              </th>
              <th className="text-left px-4 py-3 font-medium">
                <span className="flex items-center gap-1">
                  Ville <ArrowDownUp size={14} className="text-white/60" />
                </span>
              </th>
              <th className="text-left px-4 py-3 font-medium">Dégrèvement estimés</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ui-text-muted text-sm">
                  Aucun lot trouvé
                </td>
              </tr>
            ) : (
              visible.map((lot) => (
                <tr key={lot.id} className="border-b border-ui-border text-sm hover:bg-ui-bg-elevated/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="rounded"
                      aria-label={`Sélectionner ${lot.name}`}
                      checked={selected.has(lot.id)}
                      onChange={() => toggleOne(lot.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Folder size={16} className="text-folder shrink-0" />
                      <span className="text-ui-text-highlighted font-medium">{lot.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ui-text-muted">{lot.address}</td>
                  <td className="px-4 py-3 text-ui-text-muted">{lot.city}</td>
                  <td className="px-4 py-3">
                    <span className="border border-ui-border rounded-full px-2 py-0.5 text-xs text-ui-text-muted">
                      En attente
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/lots/${lot.id}`}
                      className="bg-vert-400 text-cyprus-900 rounded-md size-7 flex items-center justify-center hover:bg-vert-300 transition-colors"
                      aria-label={`Ouvrir le lot ${lot.name}`}
                    >
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 flex items-center justify-between text-xs text-ui-text-muted border-t border-ui-border">
        <span>{visible.length} sur {filtered.length} lots</span>
        <div className="relative flex items-center gap-2">
          <span>Affichage des resultats</span>
          <button
            onClick={() => setPageSizeOpen((o) => !o)}
            className="border border-ui-border rounded-md px-2 py-1 flex items-center gap-1 text-ui-text"
          >
            {pageSize} <ChevronDown size={12} />
          </button>
          {pageSizeOpen && (
            <div className="absolute right-0 bottom-8 bg-white border border-ui-border rounded-md shadow-md z-10">
              {[10, 25, 50].map((n) => (
                <button
                  key={n}
                  onClick={() => { setPageSize(n); setPageSizeOpen(false); }}
                  className={`block w-full px-4 py-2 text-sm text-left hover:bg-ui-bg-elevated transition-colors ${pageSize === n ? 'font-semibold text-ui-text-highlighted' : 'text-ui-text'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setNewName(''); setNewRef(''); }}
        title="Créer un lot"
        footer={
          <>
            <button
              onClick={() => { setCreateOpen(false); setNewName(''); setNewRef(''); }}
              className="border border-ui-border rounded-md px-4 py-2 text-sm text-ui-text hover:bg-ui-bg-elevated transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="bg-vert-400 text-vert-900 rounded-md px-4 py-2 text-sm font-medium hover:bg-vert-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Créer
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ui-text-highlighted" htmlFor="lot-nom">
              Nom <span className="text-error">*</span>
            </label>
            <input
              id="lot-nom"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex. 94077-VOLTA"
              className="border border-ui-border rounded-md px-3 py-2 text-sm text-ui-text placeholder:text-ui-text-dimmed focus:outline-none focus:border-ui-border-accented"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ui-text-highlighted" htmlFor="lot-ref">
              Référence
            </label>
            <input
              id="lot-ref"
              type="text"
              value={newRef}
              onChange={(e) => setNewRef(e.target.value)}
              placeholder="Ex. REF-001"
              className="border border-ui-border rounded-md px-3 py-2 text-sm text-ui-text placeholder:text-ui-text-dimmed focus:outline-none focus:border-ui-border-accented"
            />
          </div>
        </div>
      </Modal>

      {/* Import modal */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Importer des lots"
        footer={
          <>
            <button
              onClick={() => setImportOpen(false)}
              className="border border-ui-border rounded-md px-4 py-2 text-sm text-ui-text hover:bg-ui-bg-elevated transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleImportConfirm}
              className="bg-vert-400 text-vert-900 rounded-md px-4 py-2 text-sm font-medium hover:bg-vert-300 transition-colors"
            >
              Importer
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ui-text-muted">Sélectionnez un fichier CSV ou XLSX à importer.</p>
          <input
            type="file"
            accept=".csv,.xlsx"
            className="text-sm text-ui-text file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-ui-border file:text-sm file:text-ui-text file:bg-white hover:file:bg-ui-bg-elevated"
          />
        </div>
      </Modal>
    </div>
  );
}
```

---

### Task 6: Interactive `BiensPanel` + fix `[lotId]/page.tsx`

**Files:**
- Modify: `components/dashboard/biens-panel.tsx`
- Modify: `app/(app)/lots/[lotId]/page.tsx`

**Interfaces:**
- `BiensPanel` props: `{ lotId: string }`
- Consumes: `PanelToolbar` (controlled), `FilterChips` (controlled), `Modal`, `useToast`, `useRouter`
- Consumes types: `Bien`, `BienType`, `MOCK_BIENS`, `MOCK_FILTERS`

- [ ] **Step 1: Fix `app/(app)/lots/[lotId]/page.tsx`** (async params, pass lotId)

```tsx
import BiensPanel from '@/components/dashboard/biens-panel';

export default async function LotBiensPage({
  params,
}: {
  params: Promise<{ lotId: string }>;
}) {
  const { lotId } = await params;
  return (
    <div className="p-6">
      <BiensPanel lotId={lotId} />
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `components/dashboard/biens-panel.tsx`**

```tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownUp, ChevronDown, Trash2 } from 'lucide-react';
import { MOCK_BIENS, MOCK_FILTERS, type Bien, type BienType } from '@/lib/mock/data';
import PanelToolbar from '@/components/dashboard/panel-toolbar';
import FilterChips from '@/components/dashboard/filter-chips';
import StatusBadge from '@/components/dashboard/status-badge';
import Modal from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

const COLUMNS = ['Vos biens', 'ID', 'Surfaces', 'Étage', 'Dégrèvement estimés', 'Statut'];

export default function BiensPanel({ lotId }: { lotId: string }) {
  const toast = useToast();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<string[]>(MOCK_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(10);
  const [biens, setBiens] = useState<Bien[]>(MOCK_BIENS);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);

  // Add form state
  const [newType, setNewType] = useState<BienType>('Appartement');
  const [newRef, setNewRef] = useState('');
  const [newSurface, setNewSurface] = useState('');
  const [newEtage, setNewEtage] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return biens.filter(
      (b) =>
        b.type.toLowerCase().includes(q) ||
        b.reference.toLowerCase().includes(q)
    );
  }, [biens, search]);

  const visible = filtered.slice(0, pageSize);
  const allVisibleSelected = visible.length > 0 && visible.every((b) => selected.has(b.id));

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visible.forEach((b) => next.delete(b.id));
      } else {
        visible.forEach((b) => next.add(b.id));
      }
      return next;
    });
  }, [allVisibleSelected, visible]);

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleRemoveFilter = useCallback((f: string) => {
    setFilters((prev) => prev.filter((x) => x !== f));
  }, []);

  const handleResetFilters = useCallback(() => setFilters([]), []);

  const handleAddFilter = useCallback(() => {
    const n = filters.length + 1;
    setFilters((prev) => [...prev, `Filtre ${n}`]);
    toast('Filtre ajouté');
  }, [filters.length, toast]);

  const handleDelete = useCallback((id: string) => {
    setBiens((prev) => prev.filter((b) => b.id !== id));
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
    toast('Bien supprimé', 'error');
  }, [toast]);

  const handleVoir = useCallback((bienId: string) => {
    router.push(`/lots/${lotId}/biens/${bienId}`);
  }, [router, lotId]);

  const resetAddForm = useCallback(() => {
    setNewType('Appartement');
    setNewRef('');
    setNewSurface('');
    setNewEtage('');
  }, []);

  const handleAdd = useCallback(() => {
    const bien: Bien = {
      id: crypto.randomUUID(),
      type: newType,
      reference: newRef.trim() || crypto.randomUUID().slice(0, 12),
      surface: newSurface.trim() || '0m2',
      etage: newEtage.trim() || '0',
      degrevement: 'en_attente',
      statut: 'importe',
    };
    setBiens((prev) => [bien, ...prev]);
    setAddOpen(false);
    resetAddForm();
    toast('Bien ajouté', 'success');
  }, [newType, newRef, newSurface, newEtage, resetAddForm, toast]);

  const handleImportConfirm = useCallback(() => {
    setImportOpen(false);
    toast('Import simulé — pipeline à brancher');
  }, [toast]);

  return (
    <div className="bg-white rounded-lg border border-ui-border shadow-sm overflow-hidden flex flex-col">
      <PanelToolbar
        primaryLabel="Ajouter un bien"
        searchValue={search}
        onSearchChange={setSearch}
        onPrimary={() => setAddOpen(true)}
        onImport={() => setImportOpen(true)}
      />
      <FilterChips
        filters={filters}
        onRemove={handleRemoveFilter}
        onReset={handleResetFilters}
        onAdd={handleAddFilter}
      />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-cyprus-900 text-white text-sm">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  className="rounded"
                  aria-label="Tout sélectionner"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                />
              </th>
              {COLUMNS.map((col) => (
                <th key={col} className="text-left px-4 py-3 font-medium whitespace-nowrap">
                  <span className="flex items-center gap-1">
                    {col} <ArrowDownUp size={14} className="text-white/60" />
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-ui-text-muted text-sm">
                  Aucun bien trouvé
                </td>
              </tr>
            ) : (
              visible.map((bien) => (
                <tr key={bien.id} className="border-b border-ui-border text-sm hover:bg-ui-bg-elevated/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="rounded"
                      aria-label={`Sélectionner ${bien.reference}`}
                      checked={selected.has(bien.id)}
                      onChange={() => toggleOne(bien.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-cyprus-900 font-medium">{bien.type}</span>
                  </td>
                  <td className="px-4 py-3 text-ui-text-muted">{bien.reference}</td>
                  <td className="px-4 py-3 text-ui-text-muted">{bien.surface}</td>
                  <td className="px-4 py-3 text-ui-text-muted">{bien.etage}</td>
                  <td className="px-4 py-3">
                    <span className="border border-ui-border rounded-full px-2 py-0.5 text-xs text-ui-text-muted">
                      En attente
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge statut={bien.statut} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDelete(bien.id)}
                        className="text-error hover:bg-error/10 rounded-md size-7 flex items-center justify-center transition-colors"
                        aria-label={`Supprimer ${bien.reference}`}
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => handleVoir(bien.id)}
                        className="bg-vert-400 text-vert-900 rounded-md px-4 py-1.5 text-sm font-medium hover:bg-vert-300 transition-colors"
                      >
                        Voir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 flex items-center justify-between text-xs text-ui-text-muted border-t border-ui-border">
        <span>{visible.length} sur {filtered.length} biens</span>
        <div className="relative flex items-center gap-2">
          <span>Affichage des resultats</span>
          <button
            onClick={() => setPageSizeOpen((o) => !o)}
            className="border border-ui-border rounded-md px-2 py-1 flex items-center gap-1 text-ui-text"
          >
            {pageSize} <ChevronDown size={12} />
          </button>
          {pageSizeOpen && (
            <div className="absolute right-0 bottom-8 bg-white border border-ui-border rounded-md shadow-md z-10">
              {[10, 25, 50].map((n) => (
                <button
                  key={n}
                  onClick={() => { setPageSize(n); setPageSizeOpen(false); }}
                  className={`block w-full px-4 py-2 text-sm text-left hover:bg-ui-bg-elevated transition-colors ${pageSize === n ? 'font-semibold text-ui-text-highlighted' : 'text-ui-text'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add modal */}
      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); resetAddForm(); }}
        title="Ajouter un bien"
        footer={
          <>
            <button
              onClick={() => { setAddOpen(false); resetAddForm(); }}
              className="border border-ui-border rounded-md px-4 py-2 text-sm text-ui-text hover:bg-ui-bg-elevated transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleAdd}
              className="bg-vert-400 text-vert-900 rounded-md px-4 py-2 text-sm font-medium hover:bg-vert-300 transition-colors"
            >
              Ajouter
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ui-text-highlighted" htmlFor="bien-type">Type</label>
            <select
              id="bien-type"
              value={newType}
              onChange={(e) => setNewType(e.target.value as BienType)}
              className="border border-ui-border rounded-md px-3 py-2 text-sm text-ui-text focus:outline-none focus:border-ui-border-accented"
            >
              <option value="Appartement">Appartement</option>
              <option value="Parking">Parking</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ui-text-highlighted" htmlFor="bien-ref">ID / Référence</label>
            <input
              id="bien-ref"
              type="text"
              value={newRef}
              onChange={(e) => setNewRef(e.target.value)}
              placeholder="Ex. 940770660134"
              className="border border-ui-border rounded-md px-3 py-2 text-sm text-ui-text placeholder:text-ui-text-dimmed focus:outline-none focus:border-ui-border-accented"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ui-text-highlighted" htmlFor="bien-surface">Surface</label>
              <input
                id="bien-surface"
                type="text"
                value={newSurface}
                onChange={(e) => setNewSurface(e.target.value)}
                placeholder="Ex. 28m2"
                className="border border-ui-border rounded-md px-3 py-2 text-sm text-ui-text placeholder:text-ui-text-dimmed focus:outline-none focus:border-ui-border-accented"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ui-text-highlighted" htmlFor="bien-etage">Étage</label>
              <input
                id="bien-etage"
                type="text"
                value={newEtage}
                onChange={(e) => setNewEtage(e.target.value)}
                placeholder="Ex. 2"
                className="border border-ui-border rounded-md px-3 py-2 text-sm text-ui-text placeholder:text-ui-text-dimmed focus:outline-none focus:border-ui-border-accented"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Import modal */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Importer des biens"
        footer={
          <>
            <button
              onClick={() => setImportOpen(false)}
              className="border border-ui-border rounded-md px-4 py-2 text-sm text-ui-text hover:bg-ui-bg-elevated transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleImportConfirm}
              className="bg-vert-400 text-vert-900 rounded-md px-4 py-2 text-sm font-medium hover:bg-vert-300 transition-colors"
            >
              Importer
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ui-text-muted">Sélectionnez un fichier CSV ou XLSX à importer.</p>
          <input
            type="file"
            accept=".csv,.xlsx"
            className="text-sm text-ui-text file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-ui-border file:text-sm file:text-ui-text file:bg-white hover:file:bg-ui-bg-elevated"
          />
        </div>
      </Modal>
    </div>
  );
}
```

---

### Task 7: Sidebar, Header, BottomBar, SuiviCard — client interactivity

**Files:**
- Modify: `components/dashboard/sidebar.tsx`
- Modify: `components/dashboard/header.tsx`
- Modify: `components/dashboard/bottom-bar.tsx`
- Modify: `components/dashboard/suivi-card.tsx`

**Interfaces:**
- All consume `useToast`
- Sidebar also uses `usePathname` from `next/navigation`

- [ ] **Step 1: Rewrite `components/dashboard/sidebar.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Folder, Target, CircleHelp } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function Sidebar() {
  const pathname = usePathname();
  const toast = useToast();

  const folderActive = pathname === '/' || pathname.startsWith('/lots');

  return (
    <aside className="w-16 bg-cyprus-900 flex flex-col items-center py-4 gap-2 shrink-0">
      {/* Logo */}
      <div className="py-2 mb-2">
        <span className="text-sm font-bold text-white">OR<span className="text-vert-400">K</span></span>
      </div>

      {/* Nav icons */}
      <nav className="flex flex-col items-center gap-2 flex-1">
        <button
          onClick={() => toast('Section à venir')}
          className="size-10 flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Tableau de bord"
        >
          <LayoutGrid size={20} />
        </button>
        {/* Active item */}
        <Link
          href="/"
          className={`size-10 flex items-center justify-center rounded-md transition-colors ${
            folderActive
              ? 'bg-vert-400 text-cyprus-900'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          aria-label="Lots et biens"
        >
          <Folder size={20} />
        </Link>
        <button
          onClick={() => toast('Section à venir')}
          className="size-10 flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Objectifs"
        >
          <Target size={20} />
        </button>
      </nav>

      {/* Bottom */}
      <div className="mt-auto">
        <button
          onClick={() => toast('Section à venir')}
          className="size-10 flex items-center justify-center rounded-md text-white/40 hover:text-white/70 transition-colors"
          aria-label="Aide"
        >
          <CircleHelp size={20} />
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Rewrite `components/dashboard/header.tsx`**

```tsx
'use client';

import { Rocket } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function Header() {
  const toast = useToast();

  return (
    <header className="h-[72px] bg-white border-b border-ui-border px-8 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-medium text-black">Mon avis de taxe foncière</h1>
        <span className="bg-badge-warning-bg text-badge-warning-text rounded-md px-2 py-1 text-sm font-medium">
          Vérification gratuite
        </span>
      </div>
      <button
        onClick={() => toast('Fonctionnalité bientôt disponible')}
        className="border border-vert-900 text-vert-900 rounded-md px-3 py-2 text-sm flex items-center gap-1.5 hover:bg-vert-900/5 transition-colors"
        aria-label="Obtenir des crédits"
      >
        <Rocket size={18} />
        Obtenir des crédits
      </button>
    </header>
  );
}
```

- [ ] **Step 3: Rewrite `components/dashboard/bottom-bar.tsx`**

```tsx
'use client';

import { Save } from 'lucide-react';
import { MOCK_LAST_MODIFIED } from '@/lib/mock/data';
import { useToast } from '@/components/ui/toast';

export default function BottomBar() {
  const toast = useToast();

  return (
    <footer className="bg-white border-t border-ui-border px-8 py-4 flex items-center justify-between shrink-0">
      <span className="text-sm text-ui-text-muted">
        Dernière modification : {MOCK_LAST_MODIFIED}
      </span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => toast('Modifications enregistrées', 'success')}
          className="border border-ui-border rounded-md px-4 py-2 text-sm flex items-center gap-1.5 text-ui-text hover:bg-ui-bg-elevated transition-colors"
        >
          <Save size={16} />
          Enregistrer
        </button>
        <button
          onClick={() => toast('Génération du rapport en cours…')}
          className="bg-vert-400 text-vert-900 rounded-md px-4 py-2 text-sm font-medium hover:bg-vert-300 transition-colors"
        >
          Générer mon rapport
        </button>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Rewrite `components/dashboard/suivi-card.tsx`**

```tsx
'use client';

import { FileStack, Eye, Download } from 'lucide-react';
import { MOCK_SUIVI } from '@/lib/mock/data';
import { useToast } from '@/components/ui/toast';

export default function SuiviCard() {
  const toast = useToast();

  return (
    <div className="bg-white rounded-lg border border-ui-border">
      <div className="p-5 pb-3 flex items-center gap-3">
        <span className="size-10 rounded-md bg-ui-bg-elevated flex items-center justify-center">
          <FileStack size={20} className="text-ui-text-muted" />
        </span>
        <h2 className="text-lg font-semibold text-ui-text-highlighted">Suivi et documents utiles</h2>
      </div>
      <div className="px-3 pb-3 max-h-[320px] overflow-y-auto scrollbar-thin flex flex-col gap-2">
        {MOCK_SUIVI.map((item, index) => {
          const isLast = index === MOCK_SUIVI.length - 1;
          return (
            <div
              key={item.id}
              className={`bg-ui-bg-elevated rounded-md px-4 py-3 flex items-center justify-between${isLast ? ' opacity-60' : ''}`}
            >
              <div>
                <p className="text-sm font-semibold text-ui-text-highlighted">{item.date}</p>
                <p className="text-xs text-ui-text-muted">{item.label}</p>
              </div>
              <div className="flex items-center gap-2">
                {item.hasDownload && (
                  <button
                    onClick={() => toast('Téléchargement du document')}
                    className="text-ui-text-muted hover:text-ui-text transition-colors"
                    aria-label="Télécharger le document"
                  >
                    <Download size={16} />
                  </button>
                )}
                <button
                  onClick={() => toast('Aperçu du document')}
                  className="text-ui-text-muted hover:text-ui-text transition-colors"
                  aria-label="Aperçu du document"
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

### Task 8: Bien detail placeholder page

**Files:**
- Create: `app/(app)/lots/[lotId]/biens/[bienId]/page.tsx`

**Interfaces:**
- Consumes: `MOCK_BIENS`, `StatusBadge`
- Async params: `{ params: Promise<{ lotId: string; bienId: string }> }`

- [ ] **Step 1: Create `app/(app)/lots/[lotId]/biens/[bienId]/page.tsx`**

```tsx
import Link from 'next/link';
import { MOCK_BIENS } from '@/lib/mock/data';
import StatusBadge from '@/components/dashboard/status-badge';

export default async function BienDetailPage({
  params,
}: {
  params: Promise<{ lotId: string; bienId: string }>;
}) {
  const { lotId, bienId } = await params;
  const bien = MOCK_BIENS.find((b) => b.id === bienId);

  return (
    <div className="m-6">
      <div className="bg-white rounded-lg border border-ui-border p-6">
        <Link
          href={`/lots/${lotId}`}
          className="text-sm text-ui-text-muted hover:text-ui-text transition-colors mb-4 inline-block"
        >
          ← Retour aux biens
        </Link>

        {bien ? (
          <>
            <h1 className="text-xl font-semibold text-ui-text-highlighted mb-6">
              Fiche du bien (aperçu)
            </h1>
            <dl className="flex flex-col gap-3">
              <div className="flex gap-6">
                <dt className="text-sm text-ui-text-muted w-32 shrink-0">Type</dt>
                <dd className="text-sm text-ui-text-highlighted font-medium">{bien.type}</dd>
              </div>
              <div className="flex gap-6">
                <dt className="text-sm text-ui-text-muted w-32 shrink-0">Référence</dt>
                <dd className="text-sm text-ui-text">{bien.reference}</dd>
              </div>
              <div className="flex gap-6">
                <dt className="text-sm text-ui-text-muted w-32 shrink-0">Surface</dt>
                <dd className="text-sm text-ui-text">{bien.surface}</dd>
              </div>
              <div className="flex gap-6">
                <dt className="text-sm text-ui-text-muted w-32 shrink-0">Étage</dt>
                <dd className="text-sm text-ui-text">{bien.etage}</dd>
              </div>
              <div className="flex gap-6">
                <dt className="text-sm text-ui-text-muted w-32 shrink-0">Statut</dt>
                <dd><StatusBadge statut={bien.statut} /></dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="text-sm text-ui-text-muted">Bien introuvable.</p>
        )}
      </div>
    </div>
  );
}
```

---

### Task 9: Build verification + report

**Files:**
- Create: `.superpowers/sdd/actions-report.md` (the report file requested)

- [ ] **Step 1: Run build**

```bash
cd "C:/Users/martin.DESKTOP-2EC8QE7/OneDrive - AD-Education/Documents/M2-DEV/ECV_Incub/orka-tax"
npm run build
```

Expected output: `✓ Compiled successfully` with no TypeScript errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: `✓ No ESLint warnings or errors`.

- [ ] **Step 3: Fix any build/lint errors**

If errors appear, use the `build-error-resolver` agent sub-type to fix them with minimal diffs.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m 'feat(ui): wire interactive actions, toast and modal across dashboards'
```

- [ ] **Step 5: Write report to `.superpowers/sdd/actions-report.md`**

Ensure the `.superpowers/sdd/` directory exists, then write the report with:
- Files created/changed
- Toast + modal design summary
- Which components became `'use client'`
- Build + lint output
- Checklist of every button → action wired
- Any deviations from spec
