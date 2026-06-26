'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownUp, ArrowUp, ArrowDown, ChevronDown, Trash2 } from 'lucide-react';
import { BIEN_TYPES, BIEN_TYPE_ICON, type Bien, type BienType } from '@/lib/domain/property';
import { type ActiveFilter, type FieldDef } from '@/lib/table/filters';
import { compareAlphaNum } from '@/lib/table/compare';
import { deleteBien, simulateBiens, bulkUpdateBiens, recomputeBiens } from '@/lib/supabase/queries';
import BulkEditModal, { type BulkEditBien } from '@/components/dashboard/bulk-edit-modal';
import { bienSignature, type ComparableValues } from '@/lib/domain/comparable';
import PanelToolbar from '@/components/dashboard/panel-toolbar';
import FilterChips from '@/components/dashboard/filter-chips';
import Pagination from '@/components/dashboard/pagination';
import StatusBadge, { statutLabel } from '@/components/dashboard/status-badge';
import Modal from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useSelection } from '@/components/dashboard/selection-context';
import ConfirmDeleteModal from '@/components/dashboard/confirm-delete-modal';
import { parseImportFile, rowsToBiens, normalizeInvariant, bienValueEqual } from '@/lib/import/client';
import { CANONICAL_FIELDS } from '@/lib/canonical/fields';
import { createClient, getActiveOrgId } from '@/lib/supabase/client';
import { dbBienToBien, BIEN_DISPLAY_COLUMNS } from '@/lib/biens/display';
import type { Database } from '@/lib/supabase/types';

type BienUpdate = Database['public']['Tables']['biens']['Update'];
type BienInsert = Database['public']['Tables']['biens']['Insert'];

/** "28m2" / "28 m²" / "28" → 28 (numérique, pour la colonne surface_m2). */
function parseSurface(raw: string): number | null {
  const m = raw.replace(',', '.').match(/[\d.]+/);
  return m ? Number(m[0]) : null;
}

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

export default function BiensPanel({ lotId }: { lotId: string }) {
  const toast = useToast();
  const router = useRouter();
  const { setSelectedCount, setGenerateReady, registerGenerate } = useSelection();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [biens, setBiens] = useState<Bien[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Bien | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [comparableMap, setComparableMap] = useState<Map<string, ComparableValues>>(new Map());

  // Add form state
  const [newType, setNewType] = useState<BienType>('Appartement');
  const [newRef, setNewRef] = useState('');
  const [newSurface, setNewSurface] = useState('');
  const [newEtage, setNewEtage] = useState('');

  // Expose the selection count to the BottomBar ("Générer mon rapport").
  useEffect(() => {
    setSelectedCount(selected.size);
  }, [selected, setSelectedCount]);

  // "Générer mon rapport" runs the comparison over the whole lot, so it is
  // enabled as soon as the lot has biens.
  useEffect(() => {
    setGenerateReady(biens.length > 0);
  }, [biens, setGenerateReady]);

  // Reset the shared state when leaving this screen.
  useEffect(() => () => { setSelectedCount(0); setGenerateReady(false); }, [setSelectedCount, setGenerateReady]);

  // Charge les biens du lot depuis Supabase.
  const loadBiens = useCallback(async () => {
    const supabase = createClient();
    const [displayResult, comparableResult] = await Promise.all([
      supabase
        .from('biens')
        .select(BIEN_DISPLAY_COLUMNS)
        .eq('lot_id', lotId)
        .order('created_at', { ascending: true }),
      supabase
        .from('biens')
        .select('id, surface_m2, nb_pieces, nb_wc, nb_baignoires, nb_douches, nb_bidets, nb_eviers, ascenseur, eau_courante, gaz, electricite')
        .eq('lot_id', lotId),
    ]);

    if (displayResult.error) {
      toast('Impossible de charger les biens', 'error');
    } else {
      setBiens((displayResult.data ?? []).map(dbBienToBien));
    }

    if (comparableResult.error) {
      toast('Impossible de charger les données comparables', 'error');
    } else {
      const map = new Map<string, ComparableValues>();
      for (const row of comparableResult.data ?? []) {
        map.set(row.id, {
          surface_m2: row.surface_m2 ?? null,
          nb_pieces: row.nb_pieces ?? null,
          nb_wc: row.nb_wc ?? null,
          nb_baignoires: row.nb_baignoires ?? null,
          nb_douches: row.nb_douches ?? null,
          nb_bidets: row.nb_bidets ?? null,
          nb_eviers: row.nb_eviers ?? null,
          ascenseur: row.ascenseur ?? null,
          eau_courante: row.eau_courante ?? null,
          gaz: row.gaz ?? null,
          electricite: row.electricite ?? null,
        });
      }
      setComparableMap(map);
    }
  }, [lotId, toast]);

  // Register generate action ("Générer mon rapport") with the selection context.
  // The report covers the whole lot, not just the current selection.
  const handleGenerate = useCallback(async () => {
    const ids = biens.map((b) => b.id);
    if (!ids.length) return;
    await simulateBiens(ids);
    await loadBiens();
    setSelected(new Set());
    setSelectedCount(0);
  }, [biens, loadBiens, setSelectedCount]);

  useEffect(() => {
    registerGenerate(handleGenerate);
    return () => registerGenerate(null);
  }, [handleGenerate, registerGenerate]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) await loadBiens();
    })();
    return () => {
      active = false;
    };
  }, [loadBiens]);

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

  const bulkBiens = useMemo<BulkEditBien[]>(() => biens.map((b) => {
    const values = comparableMap.get(b.id) ?? {
      surface_m2: null, nb_pieces: null, nb_wc: null, nb_baignoires: null,
      nb_douches: null, nb_bidets: null, nb_eviers: null,
      ascenseur: null, eau_courante: null, gaz: null, electricite: null,
    };
    return {
      id: b.id,
      type: b.type,
      label: `${b.type} ${b.surface}`,
      values,
      signature: bienSignature(values),
    };
  }), [biens, comparableMap]);

  // Only the biens checked in the table feed the bulk-edit modal.
  const selectedBulkBiens = useMemo(
    () => bulkBiens.filter((b) => selected.has(b.id)),
    [bulkBiens, selected],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const visible = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  // "Select all" spans the whole filtered list (all pages), respecting active filters.
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

  const handleVoir = useCallback((bienId: string) => {
    router.push(`/lot/${lotId}/vos-biens/${bienId}`);
  }, [router, lotId]);

  const resetAddForm = useCallback(() => {
    setNewType('Appartement');
    setNewRef('');
    setNewSurface('');
    setNewEtage('');
  }, []);

  const handleAdd = useCallback(async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('biens').insert({
        org_id: getActiveOrgId(),
        lot_id: lotId,
        invariant_cadastral: newRef.trim() || null,
        nature: newType,
        surface_m2: parseSurface(newSurface),
        etage: newEtage.trim() || null,
        status: 'draft',
      });
      if (error) throw error;

      await loadBiens();
      setAddOpen(false);
      resetAddForm();
      toast('Bien ajouté', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : "Échec de l'ajout du bien", 'error');
    }
  }, [lotId, newType, newRef, newSurface, newEtage, loadBiens, resetAddForm, toast]);

  const closeImport = useCallback(() => {
    setImportOpen(false);
    setImportFile(null);
  }, []);

  const handleImportConfirm = useCallback(async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const table = await parseImportFile(importFile);
      const records = rowsToBiens(table);

      // Garde-fou : si aucune ligne ne porte d'invariant, la colonne « ID » n'a pas été
      // détectée → on refuse plutôt que de créer des doublons silencieusement.
      if (records.length > 0 && records.every((r) => normalizeInvariant(r.invariant_cadastral) === '')) {
        throw new Error(
          "Colonne « invariant / ID » introuvable dans le fichier : impossible de rapprocher les biens.",
        );
      }

      const supabase = createClient();

      // On charge les valeurs COMPLÈTES des biens du lot pour comparer champ par champ.
      const allColumns = ['id', ...CANONICAL_FIELDS.map((f) => f.key)].join(', ');
      const { data: existingRows, error: loadErr } = await supabase
        .from('biens')
        .select(allColumns)
        .eq('lot_id', lotId);
      if (loadErr) throw new Error(loadErr.message);

      // Index invariant normalisé -> ligne existante complète.
      const byInvariant = new Map<string, Record<string, unknown>>();
      for (const row of (existingRows ?? []) as unknown as Record<string, unknown>[]) {
        const key = normalizeInvariant(row.invariant_cadastral);
        if (key) byInvariant.set(key, row);
      }

      let updated = 0;
      let unchanged = 0;
      let inserted = 0;
      const affectedIds: string[] = [];
      const toInsert: BienInsert[] = [];
      for (const rec of records) {
        const key = normalizeInvariant(rec.invariant_cadastral);
        const existing = key ? byInvariant.get(key) : undefined;

        if (existing) {
          // Diff : on ne garde que les champs présents (non vides) dans le fichier ET
          // dont la valeur diffère de l'existant.
          const payload: BienUpdate = Object.fromEntries(
            Object.entries(rec).filter(
              ([k, v]) => v !== null && v !== '' && !bienValueEqual(existing[k], v),
            ),
          );
          if (Object.keys(payload).length === 0) {
            unchanged++;
            continue;
          }
          // .select() permet de compter les lignes réellement modifiées : si RLS
          // bloque l'UPDATE, Supabase ne renvoie ni erreur ni ligne.
          const { data, error } = await supabase
            .from('biens')
            .update(payload)
            .eq('id', existing.id as string)
            .select('id');
          if (error) throw new Error(error.message);
          if (data && data.length > 0) {
            updated++;
            affectedIds.push(existing.id as string);
          }
        } else {
          // Nouveau bien : pas de correspondance dans la liste → on l'ajoute au lot.
          toInsert.push({ ...rec, org_id: getActiveOrgId(), lot_id: lotId } as BienInsert);
        }
      }

      if (toInsert.length > 0) {
        const { data, error } = await supabase.from('biens').insert(toInsert).select('id');
        if (error) throw new Error(error.message);
        inserted = data?.length ?? 0;
        for (const row of data ?? []) affectedIds.push(row.id);
      }

      // Des biens devaient changer mais aucune écriture n'a abouti → RLS probable.
      if (updated === 0 && inserted === 0 && unchanged === 0 && records.length > 0) {
        throw new Error(
          "Écriture refusée par la base (RLS). Applique la migration 0004 : « demo public write » sur la table biens.",
        );
      }

      if (affectedIds.length > 0) {
        await recomputeBiens(affectedIds);
      }

      await loadBiens();
      closeImport();
      toast(
        `${updated} bien(s) mis à jour, ${inserted} ajouté(s), ${unchanged} inchangé(s)`,
        updated + inserted > 0 ? 'success' : 'default',
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : "Échec de l'import", 'error');
    } finally {
      setImporting(false);
    }
  }, [importFile, lotId, loadBiens, closeImport, toast]);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 pr-5">
        <div className="flex-1">
          <PanelToolbar
            primaryLabel="Ajouter un bien"
            searchValue={search}
            onSearchChange={setSearch}
            onPrimary={() => setAddOpen(true)}
            onImport={() => setImportOpen(true)}
            count={filtered.length}
            total={biens.length}
          />
        </div>
        <button
          onClick={() => setEditOpen(true)}
          disabled={selected.size === 0}
          title={selected.size === 0 ? 'Sélectionnez au moins un bien' : undefined}
          className="border border-ui-border rounded-md px-3 py-2 text-sm flex items-center gap-1.5 text-ui-text hover:bg-ui-bg-elevated transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Édition
        </button>
      </div>
      <FilterChips
        fields={BIEN_FIELDS}
        filters={filters}
        onAdd={handleAddFilter}
        onRemove={handleRemoveFilter}
        onReset={handleResetFilters}
      />

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
      <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-ui-text-muted">
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
              {BIEN_TYPES.map((t) => (
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
        onClose={closeImport}
        title="Mettre à jour les biens (CSV ou XLSX)"
        footer={
          <>
            <button
              onClick={closeImport}
              className="border border-ui-border rounded-md px-4 py-2 text-sm text-ui-text hover:bg-ui-bg-elevated transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleImportConfirm}
              disabled={!importFile || importing}
              className="bg-vert-400 text-vert-900 rounded-md px-4 py-2 text-sm font-medium hover:bg-vert-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Import…' : 'Importer'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ui-text-muted">
            Sélectionnez un fichier CSV ou XLSX. Les biens y figurant (rapprochés par leur
            invariant cadastral) seront mis à jour&nbsp;; les biens absents du fichier restent
            inchangés.
          </p>
          <input
            type="file"
            accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            className="text-sm text-ui-text file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-ui-border file:text-sm file:text-ui-text file:bg-white hover:file:bg-ui-bg-elevated"
          />
        </div>
      </Modal>

      {/* Bulk edit modal */}
      <BulkEditModal
        open={editOpen}
        biens={selectedBulkBiens}
        onClose={() => setEditOpen(false)}
        onApply={async (ids, patch) => {
          const { anomalies } = await bulkUpdateBiens(ids, patch);
          await loadBiens();
          if (anomalies > 0) {
            toast(`${anomalies} bien${anomalies > 1 ? 's' : ''} en anomalie détecté${anomalies > 1 ? 's' : ''}`, 'error');
          } else {
            toast('Aucune anomalie détectée', 'success');
          }
        }}
      />
    </div>
  );
}
