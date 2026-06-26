'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { BIEN_TYPE_ICON } from '@/lib/domain/property';
import { type ActiveFilter, type FieldDef } from '@/lib/table/filters';
import { comparableFieldLabel } from '@/lib/domain/comparable';
import {
  fetchAnomalyBiensByProfile,
  fetchDeclarationCounts,
  createReclamation,
  deleteBien,
  type AnomalyBien,
} from '@/lib/supabase/queries';
import ConfirmDeleteModal from '@/components/dashboard/confirm-delete-modal';
import { useFiscalProfile } from '@/components/dashboard/fiscal-profile-context';
import PanelToolbarAnomalies from '@/components/dashboard/panel-toolbar-anomalies';
import FilterChips from '@/components/dashboard/filter-chips';
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

const BIEN_ACCESSORS: Record<string, (b: AnomalyBien) => string> = {
  type:      (b) => b.type,
  reference: (b) => b.reference,
  surface:   (b) => b.surface,
  etage:     (b) => b.etage,
  statut:    (b) => statutLabel(b.statut),
};

interface LotGroup {
  lotId: string;
  lotName: string;
  biens: AnomalyBien[];
}

export default function AnomaliesPanel() {
  const toast = useToast();
  const router = useRouter();
  const { activeProfileId } = useFiscalProfile();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  const [biens, setBiens] = useState<AnomalyBien[]>([]);
  const [totalBiens, setTotalBiens] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterAnomalieOnly, setFilterAnomalieOnly] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AnomalyBien | null>(null);
  const [generatingLot, setGeneratingLot] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem('filter_anomalie') === '1') {
      setFilterAnomalieOnly(true);
      sessionStorage.removeItem('filter_anomalie');
    }
  }, []);

  const load = useCallback(async () => {
    if (!activeProfileId) { setBiens([]); setTotalBiens(0); setLoading(false); return; }
    setLoading(true);
    try {
      const [rows, counts] = await Promise.all([
        fetchAnomalyBiensByProfile(activeProfileId),
        fetchDeclarationCounts(activeProfileId),
      ]);
      setBiens(rows);
      setTotalBiens(counts.biens);
    } catch {
      toast('Impossible de charger les biens', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeProfileId, toast]);

  useEffect(() => {
    setFilters([]);
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return biens.filter((b) => {
      if (filterAnomalieOnly && b.statut !== 'anomalie') return false;
      const matchSearch =
        b.type.toLowerCase().includes(q) ||
        b.reference.toLowerCase().includes(q) ||
        b.lotName.toLowerCase().includes(q);
      const matchFilters = filters.every((f) =>
        (BIEN_ACCESSORS[f.field]?.(b) ?? '').toLowerCase().includes(f.value.toLowerCase())
      );
      return matchSearch && matchFilters;
    });
  }, [biens, search, filters, filterAnomalieOnly]);

  const groups = useMemo<LotGroup[]>(() => {
    const map = new Map<string, LotGroup>();
    for (const b of filtered) {
      const g = map.get(b.lotId) ?? { lotId: b.lotId, lotName: b.lotName, biens: [] };
      g.biens.push(b);
      map.set(b.lotId, g);
    }
    return [...map.values()].sort((a, b) => a.lotName.localeCompare(b.lotName));
  }, [filtered]);

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

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    try {
      await deleteBien(id);
      setBiens((prev) => prev.filter((b) => b.id !== id));
      toast('Bien supprimé', 'success');
    } catch {
      toast('Échec de la suppression', 'error');
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, toast]);

  const handleVoir = useCallback((bien: AnomalyBien) => {
    router.push('/lot/' + bien.lotId + '/vos-biens/' + bien.id);
  }, [router]);

  const handleGenererReclamation = useCallback(async (lotId: string, lotName: string) => {
    setGeneratingLot(lotId);
    try {
      const { total } = await createReclamation(lotId);
      toast('Réclamation générée pour ' + lotName + ' (' + total + ' €)', 'success');
      await load();
    } catch {
      toast('Échec de la génération de la réclamation', 'error');
    } finally {
      setGeneratingLot(null);
    }
  }, [load, toast]);

  const handleImportConfirm = useCallback(() => {
    setImportOpen(false);
    toast('Import simulé — pipeline à brancher');
  }, [toast]);

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

      {loading ? (
        <p className="px-1 py-6 text-sm text-ui-text-muted">Chargement…</p>
      ) : groups.length === 0 ? (
        <p className="px-1 py-6 text-sm text-ui-text-muted">Aucune anomalie à qualifier.</p>
      ) : (
        <div className="flex flex-col gap-6 pb-4">
          {groups.map((group) => (
            <section key={group.lotId} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ui-text-highlighted">{group.lotName}</span>
                  <span className="text-xs text-ui-text-muted">
                    {group.biens.length} bien{group.biens.length > 1 ? 's' : ''} en anomalie
                  </span>
                </div>
                <button
                  onClick={() => handleGenererReclamation(group.lotId, group.lotName)}
                  disabled={generatingLot === group.lotId}
                  className="bg-cyprus-900 text-white rounded-md px-3 py-2 text-sm font-medium hover:bg-cyprus-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {generatingLot === group.lotId ? 'Génération…' : 'Générer ma réclamation'}
                </button>
              </div>

              <div className="overflow-auto bg-white border border-ui-border rounded-lg">
                <table className="w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-cyprus-900 text-white text-sm">
                      <th className="text-left px-4 py-3 font-medium whitespace-nowrap rounded-tl-lg">Vos biens</th>
                      <th className="text-left px-4 py-3 font-medium whitespace-nowrap">ID</th>
                      <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Surface</th>
                      <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Étage</th>
                      <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Anomalie</th>
                      <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Dégrèvement ±</th>
                      <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Statut</th>
                      <th className="px-4 py-3 w-24 rounded-tr-lg"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.biens.map((bien) => (
                      <tr key={bien.id} className="border-b border-ui-border text-sm hover:bg-ui-bg-elevated/50 transition-colors">
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
                            <button
                              onClick={() => setDeleteTarget(bien)}
                              className="text-error hover:bg-error/10 rounded-md size-7 flex items-center justify-center transition-colors"
                              aria-label={'Supprimer ' + bien.reference}
                            >
                              <Trash2 size={16} />
                            </button>
                            <button
                              onClick={() => handleVoir(bien)}
                              className="bg-vert-400 text-vert-900 rounded-md px-4 py-1.5 text-sm font-medium hover:bg-vert-300 transition-colors"
                            >
                              Voir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title={'Supprimer le bien « ' + (deleteTarget?.reference ?? '') + ' »'}
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
            <button onClick={handleImportConfirm} className="bg-vert-400 text-vert-900 rounded-md px-4 py-2 text-sm font-medium hover:bg-vert-300 transition-colors">
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
