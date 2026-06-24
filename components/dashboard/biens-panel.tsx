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
