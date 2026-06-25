'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowDownUp, ArrowUp, ArrowDown, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import { type Lot } from '@/lib/domain/property';
import { type ActiveFilter, type FieldDef } from '@/lib/table/filters';
import { compareAlphaNum } from '@/lib/table/compare';
import { fetchLots, createLot, deleteLot } from '@/lib/supabase/queries';
import ConfirmDeleteModal from '@/components/dashboard/confirm-delete-modal';
import { getActiveOrgId } from '@/lib/supabase/client';
import { useFiscalProfile } from '@/components/dashboard/fiscal-profile-context';
import PanelToolbar from '@/components/dashboard/panel-toolbar';
import FilterChips from '@/components/dashboard/filter-chips';
import Pagination from '@/components/dashboard/pagination';
import Modal from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useSelection } from '@/components/dashboard/selection-context';

const LOT_FIELDS: FieldDef[] = [
  { key: 'name',    label: 'Lot' },
  { key: 'address', label: 'Adresse' },
  { key: 'city',    label: 'Ville' },
];

const LOT_ACCESSORS: Record<string, (l: Lot) => string> = {
  name:    (l) => l.name,
  address: (l) => l.address,
  city:    (l) => l.city,
};

export default function LotsPanel() {
  const toast = useToast();
  const { setSelectedCount } = useSelection();
  const { activeProfileId } = useFiscalProfile();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lot | null>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newRef, setNewRef] = useState('');

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

  // Expose the selection count to the BottomBar ("Générer mon rapport").
  useEffect(() => {
    setSelectedCount(selected.size);
  }, [selected, setSelectedCount]);

  // Reset the shared count when leaving this screen.
  useEffect(() => () => setSelectedCount(0), [setSelectedCount]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return lots.filter((l) => {
      const matchSearch =
        l.name.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q);
      const matchFilters = filters.every((f) =>
        (LOT_ACCESSORS[f.field]?.(l) ?? '').toLowerCase().includes(f.value.toLowerCase())
      );
      return matchSearch && matchFilters;
    });
  }, [lots, search, filters]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const accessor = LOT_ACCESSORS[sort.key];
    if (!accessor) return filtered;
    return [...filtered].sort((a, b) => {
      const cmp = compareAlphaNum(accessor(a), accessor(b));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const visible = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

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

  const handleRemoveFilter = useCallback((id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleResetFilters = useCallback(() => setFilters([]), []);

  const handleAddFilter = useCallback((field: FieldDef, value: string) => {
    const isDuplicate = filters.some(
      (f) => f.field === field.key && f.value.toLowerCase() === value.toLowerCase()
    );
    if (isDuplicate) {
      toast('Ce filtre existe déjà', 'error');
      return;
    }
    setFilters((prev) => [
      ...prev,
      { id: crypto.randomUUID(), field: field.key, label: field.label, value },
    ]);
    toast('Filtre ajouté', 'success');
  }, [filters, toast]);

  const handleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  }, []);

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

  const handleImportConfirm = useCallback(() => {
    setImportOpen(false);
    toast('Import simulé — pipeline à brancher');
  }, [toast]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    try {
      await deleteLot(id);
      setLots((prev) => prev.filter((l) => l.id !== id));
      setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
      toast('Lot supprimé', 'error');
    } catch {
      toast('Échec de la suppression du lot', 'error');
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, toast]);

  return (
    <div className="bg-white rounded-lg border border-ui-border shadow-sm overflow-hidden flex flex-col">
      <PanelToolbar
        primaryLabel="Créer un lot"
        searchValue={search}
        onSearchChange={setSearch}
        onPrimary={() => setCreateOpen(true)}
        onImport={() => setImportOpen(true)}
        count={filtered.length}
        total={lots.length}
      />
      <FilterChips
        fields={LOT_FIELDS}
        filters={filters}
        onAdd={handleAddFilter}
        onRemove={handleRemoveFilter}
        onReset={handleResetFilters}
      />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-cyprus-950 text-white text-sm">
              <th className="px-4 py-3 w-10 rounded-tl-lg">
                <input
                  type="checkbox"
                  className="rounded"
                  aria-label="Tout sélectionner"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                />
              </th>
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
              <th className="text-left px-4 py-3 font-medium">Dégrèvement estimés</th>
              <th className="px-4 py-3 w-24 rounded-tr-lg"></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ui-text-muted text-sm">
                  {loading ? 'Chargement…' : 'Aucun lot trouvé'}
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
                      <img src="/assets/lots.webp" alt="" className="size-6 shrink-0" />
                      <span className="block max-w-[160px] truncate text-ui-text-highlighted font-medium" title={lot.name}>{lot.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block max-w-[220px] truncate uppercase text-ui-text-muted" title={lot.address}>{lot.address}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block max-w-[160px] truncate uppercase text-ui-text-muted" title={lot.city}>{lot.city}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="border border-ui-border rounded-full px-2 py-0.5 text-xs text-ui-text-muted">
                      En attente
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setDeleteTarget(lot)}
                        className="text-error hover:bg-error/10 rounded-md size-7 flex items-center justify-center transition-colors"
                        aria-label={`Supprimer ${lot.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                      <Link
                        href={`/lot/${lot.id}/vos-biens`}
                        className="bg-vert-400 text-cyprus-900 rounded-md size-7 flex items-center justify-center hover:bg-vert-300 transition-colors"
                        aria-label={`Ouvrir le lot ${lot.name}`}
                      >
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-ui-text-muted border-t border-ui-border">
        <span>
          {filtered.length === 0
            ? '0'
            : `${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, filtered.length)}`
          }{' '}
          sur {filtered.length} lots
        </span>
        <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
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
                  onClick={() => { setPageSize(n); setPage(1); setPageSizeOpen(false); }}
                  className={`block w-full px-4 py-2 text-sm text-left hover:bg-ui-bg-elevated transition-colors ${pageSize === n ? 'font-semibold text-ui-text-highlighted' : 'text-ui-text'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm delete modal */}
      <ConfirmDeleteModal
        open={!!deleteTarget}
        title={`Supprimer le lot « ${deleteTarget?.name ?? ''} »`}
        description={"Êtes-vous sûr de vouloir supprimer ce lot ?\nCette action est irréversible."}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />

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
              className="bg-vert-400 text-vert-900 rounded-md px-4 py-2 text-sm font-medium hover:bg-vert-300 transition-colors disabled:bg-ui-border disabled:text-ui-text-dimmed disabled:cursor-not-allowed"
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
