'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownUp, ArrowUp, ArrowDown, ChevronDown, Trash2 } from 'lucide-react';
import { BIEN_TYPE_ICON, type Bien } from '@/lib/domain/property';
import { type ActiveFilter, type FieldDef } from '@/lib/table/filters';
import { compareAlphaNum } from '@/lib/table/compare';
import { comparableFieldLabel } from '@/lib/domain/comparable';
import { fetchAnomalyBiensByProfile, fetchDeclarationCounts, createReclamationForProfile, deleteBien } from '@/lib/supabase/queries';
import ConfirmDeleteModal from '@/components/dashboard/confirm-delete-modal';
import { useFiscalProfile } from '@/components/dashboard/fiscal-profile-context';
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

export default function AnomaliesPanel() {
  const toast = useToast();
  const router = useRouter();
  const { activeProfileId } = useFiscalProfile();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [biens, setBiens] = useState<Bien[]>([]);
  const [totalBiens, setTotalBiens] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterAnomalieOnly, setFilterAnomalieOnly] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Bien | null>(null);
  const [generatingReclamation, setGeneratingReclamation] = useState(false);

  // Lire les flags sessionStorage au montage.
  useEffect(() => {
    if (sessionStorage.getItem('filter_anomalie') === '1') {
      setFilterAnomalieOnly(true);
      sessionStorage.removeItem('filter_anomalie');
    }
  }, []);

  // Load biens for the active fiscal profile; reset view on switch.
  useEffect(() => {
    if (!activeProfileId) { setBiens([]); setTotalBiens(0); setLoading(false); return; }
    let active = true;
    setLoading(true);
    setPage(1);
    setFilters([]);
    setSelected(new Set());
    Promise.all([
      fetchAnomalyBiensByProfile(activeProfileId),
      fetchDeclarationCounts(activeProfileId),
    ])
      .then(([rows, counts]) => { if (active) { setBiens(rows); setTotalBiens(counts.biens); } })
      .catch(() => { if (active) toast('Impossible de charger les biens', 'error'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeProfileId, toast]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return biens.filter((b) => {
      if (filterAnomalieOnly && b.statut !== 'anomalie') return false;
      const matchSearch =
        b.type.toLowerCase().includes(q) ||
        b.reference.toLowerCase().includes(q);
      const matchFilters = filters.every((f) =>
        (BIEN_ACCESSORS[f.field]?.(b) ?? '').toLowerCase().includes(f.value.toLowerCase())
      );
      return matchSearch && matchFilters;
    });
  }, [biens, search, filters, filterAnomalieOnly]);

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
  // "Select all" spans the whole filtered list (all pages), not just the current page.
  const allFilteredSelected = filtered.length > 0 && filtered.every((b) => selected.has(b.id));

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((b) => next.delete(b.id));
      } else {
        filtered.forEach((b) => next.add(b.id));
      }
      return next;
    });
  }, [allFilteredSelected, filtered]);

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
      toast('Bien supprimé', 'success');
    } catch {
      toast('Échec de la suppression', 'error');
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, toast]);

  const handleVoir = useCallback((bien: Bien) => {
    router.push(`/lot/${bien.lotId}/vos-biens/${bien.id}`);
  }, [router]);

  const handleImportConfirm = useCallback(() => {
    setImportOpen(false);
    toast('Import simulé — pipeline à brancher');
  }, [toast]);

  const hasAnomalieBiens = useMemo(() => biens.some((b) => b.statut === 'anomalie'), [biens]);

  const handleGenererReclamation = useCallback(async () => {
    if (!activeProfileId) return;
    setGeneratingReclamation(true);
    try {
      const { total, lots } = await createReclamationForProfile(activeProfileId);
      toast(`Réclamation générée sur ${lots} lot${lots > 1 ? 's' : ''} (${total} €)`, 'success');
      router.push('/results-reclamations');
    } catch {
      toast('Échec de la génération de la réclamation', 'error');
      setGeneratingReclamation(false);
    }
  }, [activeProfileId, router, toast]);

  const montant = biens.reduce((s, b) => s + Math.max(0, b.degrevement), 0);
  const rate = totalBiens > 0 ? (biens.length / totalBiens) * 100 : 0;

  return (
    <div className="flex flex-col">
      <StatsbarAnomalies count={biens.length} rate={rate} montant={montant} />
      <PanelToolbarAnomalies
        searchValue={search}
        onSearchChange={setSearch}
        onImport={() => setImportOpen(true)}
        count={filtered.length}
        total={biens.length}
        onReclamation={handleGenererReclamation}
        reclamationLabel={generatingReclamation ? 'Génération…' : 'Générer ma réclamation'}
        reclamationDisabled={!hasAnomalieBiens || generatingReclamation}
      />
      <FilterChips
        fields={BIEN_FIELDS}
        filters={filters}
        onAdd={handleAddFilter}
        onRemove={handleRemoveFilter}
        onReset={handleResetFilters}
      />
      <DuplicatesCountAnomalies />
      {filterAnomalieOnly && (
        <div className="flex items-center gap-2 mb-2 px-1 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
          <span className="flex-1">Affichage filtré : biens avec anomalie détectée uniquement</span>
          <button
            onClick={() => setFilterAnomalieOnly(false)}
            className="text-xs underline hover:text-orange-900 transition-colors shrink-0"
          >
            Tout afficher
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white border border-ui-border rounded-lg">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-cyprus-900 text-white text-sm">
              <th className="px-4 py-3 w-10 rounded-tl-lg">
                <input
                  type="checkbox"
                  className="rounded"
                  aria-label="Tout sélectionner"
                  checked={allFilteredSelected}
                  onChange={toggleAll}
                />
              </th>
              <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
                <button onClick={() => handleSort('type')} className="flex items-center gap-1 w-full">
                  Vos biens
                  {sort?.key === 'type' ? (sort.dir === 'asc' ? <ArrowUp size={14} className="text-vert-400" /> : <ArrowDown size={14} className="text-vert-400" />) : <ArrowDownUp size={14} className="text-white/60" />}
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
                <button onClick={() => handleSort('reference')} className="flex items-center gap-1 w-full">
                  ID
                  {sort?.key === 'reference' ? (sort.dir === 'asc' ? <ArrowUp size={14} className="text-vert-400" /> : <ArrowDown size={14} className="text-vert-400" />) : <ArrowDownUp size={14} className="text-white/60" />}
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
                <button onClick={() => handleSort('surface')} className="flex items-center gap-1 w-full">
                  Surfaces
                  {sort?.key === 'surface' ? (sort.dir === 'asc' ? <ArrowUp size={14} className="text-vert-400" /> : <ArrowDown size={14} className="text-vert-400" />) : <ArrowDownUp size={14} className="text-white/60" />}
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
                <button onClick={() => handleSort('etage')} className="flex items-center gap-1 w-full">
                  Étage
                  {sort?.key === 'etage' ? (sort.dir === 'asc' ? <ArrowUp size={14} className="text-vert-400" /> : <ArrowDown size={14} className="text-vert-400" />) : <ArrowDownUp size={14} className="text-white/60" />}
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Anomalie</th>
              <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Dégrèvement ±</th>
              <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
                <button onClick={() => handleSort('statut')} className="flex items-center gap-1 w-full">
                  Statut
                  {sort?.key === 'statut' ? (sort.dir === 'asc' ? <ArrowUp size={14} className="text-vert-400" /> : <ArrowDown size={14} className="text-vert-400" />) : <ArrowDownUp size={14} className="text-white/60" />}
                </button>
              </th>
              <th className="px-4 py-3 w-24 rounded-tr-lg"></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-ui-text-muted text-sm">
                  {loading ? 'Chargement…' : 'Aucune anomalie trouvée'}
                </td>
              </tr>
            ) : (
              visible.map((bien) => (
                <tr key={bien.id} className="border-b border-ui-border text-sm hover:bg-ui-bg-elevated/50 transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded" aria-label={`Sélectionner ${bien.reference}`} checked={selected.has(bien.id)} onChange={() => toggleOne(bien.id)} />
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
                    {bien.anomalies.length > 0 ? (
                      <span className="text-xs text-ui-text-muted">
                        {bien.anomalies.map((a) => comparableFieldLabel(a.field)).join(', ')}
                      </span>
                    ) : <span className="text-xs text-ui-text-dimmed">—</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={bien.degrevement >= 0 ? 'text-success-txt font-medium' : 'text-error font-medium'}>
                      {bien.degrevement >= 0 ? '+' : ''}{bien.degrevement.toFixed(2)} €
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge statut={bien.statut} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setDeleteTarget(bien)} className="text-error hover:bg-error/10 rounded-md size-7 flex items-center justify-center transition-colors" aria-label={`Supprimer ${bien.reference}`}>
                        <Trash2 size={16} />
                      </button>
                      <button onClick={() => handleVoir(bien)} className="bg-vert-400 text-vert-900 rounded-md px-4 py-1.5 text-sm font-medium hover:bg-vert-300 transition-colors">
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
      <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-ui-text-muted">
        <span>
          {filtered.length === 0 ? '0' : `${(safePage - 1) * pageSize + 1}-${Math.min(safePage * pageSize, filtered.length)}`}{' '}
          sur {filtered.length} biens
        </span>
        <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
        <div className="relative flex items-center gap-2">
          <span>Affichage des resultats</span>
          <button onClick={() => setPageSizeOpen((o) => !o)} className="border border-ui-border rounded-md px-2 py-1 flex items-center gap-1 text-ui-text">
            {pageSize} <ChevronDown size={12} />
          </button>
          {pageSizeOpen && (
            <div className="absolute right-0 bottom-8 bg-white border border-ui-border rounded-md shadow-md z-10">
              {[10, 25, 50].map((n) => (
                <button key={n} onClick={() => { setPageSize(n); setPage(1); setPageSizeOpen(false); }} className={`block w-full px-4 py-2 text-sm text-left hover:bg-ui-bg-elevated transition-colors ${pageSize === n ? 'font-semibold text-ui-text-highlighted' : 'text-ui-text'}`}>
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title={`Supprimer le bien « ${deleteTarget?.reference ?? ''} »`}
        description={"Êtes-vous sûr de vouloir supprimer ce bien ?\nCette action est irréversible."}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Importer des biens"
        footer={
          <>
            <button onClick={() => setImportOpen(false)} className="border border-ui-border rounded-md px-4 py-2 text-sm text-ui-text hover:bg-ui-bg-elevated transition-colors">
              Annuler
            </button>
            <button onClick={() => setImportOpen(false)} className="bg-vert-400 text-vert-900 rounded-md px-4 py-2 text-sm font-medium hover:bg-vert-300 transition-colors">
              Importer
            </button>
          </>
        }
      >
        <p className="text-sm text-ui-text-muted">L'import se fait depuis la page de gestion des biens d'un lot.</p>
      </Modal>
    </div>
  );
}
