'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownUp, ArrowUp, ArrowDown, ChevronDown, Trash2 } from 'lucide-react';
import { BIEN_TYPES, BIEN_TYPE_ICON, type Bien, type BienType } from '@/lib/domain/property';
import { type ActiveFilter, type FieldDef } from '@/lib/table/filters';
import { compareAlphaNum } from '@/lib/table/compare';
import { fetchBiens, createBien, deleteBien } from '@/lib/supabase/queries';
import ConfirmDeleteModal from '@/components/dashboard/confirm-delete-modal';
import { getActiveOrgId } from '@/lib/supabase/client';
import PanelToolbarAnomalies from '@/components/dashboard/panel-toolbar-anomalies';
import FilterChips from '@/components/dashboard/filter-chips';
import Pagination from '@/components/dashboard/pagination';
import StatusBadge, { statutLabel } from '@/components/dashboard/status-badge';
import Modal from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import DuplicatesCountAnomalies from './duplicates-count-anomalies';
import StatsbarAnomalies from './statsbar-anomalies';

const BIEN_FIELDS: FieldDef[] = [
  { key: 'type',      label: 'Type' },
  { key: 'reference', label: 'ID' },
  { key: 'surface',   label: 'Surface' },
  { key: 'etage',     label: 'Étage' },
  { key: 'statut',    label: 'Statut' },
];

const BIEN_ACCESSORS: Record<string, (b: Bien) => string> = {
  type:      (b) => b.type,
  reference: (b) => b.reference,
  surface:   (b) => b.surface,
  etage:     (b) => b.etage,
  statut:    (b) => statutLabel(b.statut),
};

export default function AnomaliesPanel({ lotId }: { lotId: string }) {
  const toast = useToast();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [biens, setBiens] = useState<Bien[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Bien | null>(null);

  // Add form state
  const [newType, setNewType] = useState<BienType>('Appartement');
  const [newRef, setNewRef] = useState('');
  const [newSurface, setNewSurface] = useState('');
  const [newEtage, setNewEtage] = useState('');

  // Load the lot's biens from Supabase.
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchBiens(lotId)
      .then((rows) => { if (active) setBiens(rows); })
      .catch(() => { if (active) toast('Impossible de charger les biens', 'error'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lotId, toast]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return biens.filter((b) => {
      const matchSearch =
        b.type.toLowerCase().includes(q) ||
        b.reference.toLowerCase().includes(q);
      const matchFilters = filters.every((f) =>
        (BIEN_ACCESSORS[f.field]?.(b) ?? '').toLowerCase().includes(f.value.toLowerCase())
      );
      return matchSearch && matchFilters;
    });
  }, [biens, search, filters]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const accessor = BIEN_ACCESSORS[sort.key];
    if (!accessor) return filtered;
    return [...filtered].sort((a, b) => {
      const cmp = compareAlphaNum(accessor(a), accessor(b));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const visible = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
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

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    try {
      await deleteBien(id);
      setBiens((prev) => prev.filter((b) => b.id !== id));
      setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
      toast('Bien supprimé', 'error');
    } catch {
      toast('Échec de la suppression', 'error');
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, toast]);

  const handleVoir = useCallback((bienId: string) => {
    router.push(`/manage-anomalies/${lotId}/vos-biens/${bienId}`);
  }, [router, lotId]);

  const resetAddForm = useCallback(() => {
    setNewType('Appartement');
    setNewRef('');
    setNewSurface('');
    setNewEtage('');
  }, []);

  const handleAdd = useCallback(async () => {
    try {
      const bien = await createBien(getActiveOrgId(), lotId, {
        type: newType,
        reference: newRef.trim() || crypto.randomUUID().slice(0, 12),
        surface: newSurface.trim() || '0m2',
        etage: newEtage.trim() || '0',
      });
      setBiens((prev) => [bien, ...prev]);
      setAddOpen(false);
      resetAddForm();
      toast('Bien ajouté', 'success');
    } catch {
      toast("Échec de l’ajout du bien", 'error');
    }
  }, [lotId, newType, newRef, newSurface, newEtage, resetAddForm, toast]);

  const handleImportConfirm = useCallback(() => {
    setImportOpen(false);
    toast('Import simulé — pipeline à brancher');
  }, [toast]);

  return (
    
    <div className="bg-white rounded-lg border border-ui-border shadow-sm overflow-hidden flex flex-col">
      <StatsbarAnomalies/>
      <PanelToolbarAnomalies
        primaryLabel="Ajouter un bien"
        searchValue={search}
        onSearchChange={setSearch}
        onPrimary={() => setAddOpen(true)}
        onImport={() => setImportOpen(true)}
        count={filtered.length}
        total={biens.length}
      />
      <FilterChips
        fields={BIEN_FIELDS}
        filters={filters}
        onAdd={handleAddFilter}
        onRemove={handleRemoveFilter}
        onReset={handleResetFilters}
      />
      <DuplicatesCountAnomalies/>
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
              <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
                <button onClick={() => handleSort('type')} className="flex items-center gap-1 w-full">
                  Vos biens
                  {sort?.key === 'type' ? (
                    sort.dir === 'asc'
                      ? <ArrowUp size={14} className="text-vert-400" />
                      : <ArrowDown size={14} className="text-vert-400" />
                  ) : (
                    <ArrowDownUp size={14} className="text-white/60" />
                  )}
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
                <button onClick={() => handleSort('reference')} className="flex items-center gap-1 w-full">
                  ID
                  {sort?.key === 'reference' ? (
                    sort.dir === 'asc'
                      ? <ArrowUp size={14} className="text-vert-400" />
                      : <ArrowDown size={14} className="text-vert-400" />
                  ) : (
                    <ArrowDownUp size={14} className="text-white/60" />
                  )}
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
                <button onClick={() => handleSort('surface')} className="flex items-center gap-1 w-full">
                  Surfaces
                  {sort?.key === 'surface' ? (
                    sort.dir === 'asc'
                      ? <ArrowUp size={14} className="text-vert-400" />
                      : <ArrowDown size={14} className="text-vert-400" />
                  ) : (
                    <ArrowDownUp size={14} className="text-white/60" />
                  )}
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
                <button onClick={() => handleSort('etage')} className="flex items-center gap-1 w-full">
                  Étage
                  {sort?.key === 'etage' ? (
                    sort.dir === 'asc'
                      ? <ArrowUp size={14} className="text-vert-400" />
                      : <ArrowDown size={14} className="text-vert-400" />
                  ) : (
                    <ArrowDownUp size={14} className="text-white/60" />
                  )}
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Dégrèvement estimés</th>
              <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
                <button onClick={() => handleSort('statut')} className="flex items-center gap-1 w-full">
                  Statut
                  {sort?.key === 'statut' ? (
                    sort.dir === 'asc'
                      ? <ArrowUp size={14} className="text-vert-400" />
                      : <ArrowDown size={14} className="text-vert-400" />
                  ) : (
                    <ArrowDownUp size={14} className="text-white/60" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 w-24 rounded-tr-lg"></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-ui-text-muted text-sm">
                  {loading ? 'Chargement…' : 'Aucun bien trouvé'}
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
                    <span className="flex items-center gap-2">
                      <img src={BIEN_TYPE_ICON[bien.type]} alt="" className="size-6 shrink-0" />
                      <span className="block max-w-[140px] truncate text-cyprus-900 font-medium" title={bien.type}>{bien.type}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block max-w-[160px] truncate text-ui-text-muted" title={bien.reference}>{bien.reference}</span>
                  </td>
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
                        onClick={() => setDeleteTarget(bien)}
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
      <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-ui-text-muted border-t border-ui-border">
        <span>
          {filtered.length === 0
            ? '0'
            : `${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, filtered.length)}`
          }{' '}
          sur {filtered.length} biens
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
        title={`Supprimer le bien « ${deleteTarget?.reference ?? ''} »`}
        description={"Êtes-vous sûr de vouloir supprimer ce bien ?\nCette action est irréversible."}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />

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
            <span className="text-sm font-medium text-ui-text-highlighted">Type</span>
            <div className="grid grid-cols-3 gap-2">
              {BIEN_TYPES.map((t: BienType) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNewType(t)}
                  className={`flex flex-col items-center gap-1.5 rounded-md border p-3 text-sm transition-colors ${
                    newType === t ? 'border-vert-400 bg-vert-50 text-cyprus-900' : 'border-ui-border text-ui-text hover:bg-ui-bg-elevated'
                  }`}
                  aria-pressed={newType === t}
                >
                  <img src={BIEN_TYPE_ICON[t]} alt="" className="size-10" />
                  {t}
                </button>
              ))}
            </div>
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
