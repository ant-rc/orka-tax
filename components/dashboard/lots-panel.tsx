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

  const handleAddFilter = useCallback((value: string) => {
    if (filters.includes(value)) {
      toast('Ce filtre existe déjà', 'error');
      return;
    }
    setFilters((prev) => [...prev, value]);
    toast('Filtre ajouté', 'success');
  }, [filters, toast]);

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
                      href={`/lot/${lot.id}/vos-biens`}
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
