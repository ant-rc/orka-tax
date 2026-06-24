import { Search, Download, Plus, ArrowDownUp, Folder, ChevronRight, ChevronDown, X } from 'lucide-react';
import { MOCK_LOTS, MOCK_FILTERS, MOCK_COUNTS } from '@/lib/mock/data';

export default function LotsPanel() {
  return (
    <div className="bg-white rounded-lg border border-ui-border shadow-sm overflow-hidden flex flex-col">
      {/* Toolbar */}
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
              className="border border-ui-border rounded-md pl-8 pr-3 py-2 text-sm w-60 text-ui-text placeholder:text-ui-text-dimmed focus:outline-none focus:border-ui-border-accented"
            />
          </div>
          <button className="border border-ui-border rounded-md px-3 py-2 text-sm flex items-center gap-1.5 text-ui-text hover:bg-ui-bg-elevated transition-colors">
            <Download size={14} />
            Importer
          </button>
          <button className="bg-vert-400 text-vert-900 rounded-md px-3 py-2 text-sm font-medium flex items-center gap-1.5 hover:bg-vert-300 transition-colors">
            <Plus size={14} />
            Créer un lot
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="px-5 py-3 flex items-center gap-2 flex-wrap text-sm border-b border-ui-border">
        {MOCK_FILTERS.map((filter) => (
          <span
            key={filter}
            className="bg-ui-bg-elevated border border-ui-border rounded-md px-2 py-1 text-xs flex items-center gap-1 text-ui-text"
          >
            {filter}
            <button className="text-ui-text-muted hover:text-ui-text transition-colors">
              <X size={12} />
            </button>
          </span>
        ))}
        <button className="text-ui-text-muted flex items-center gap-1 text-xs hover:text-ui-text transition-colors">
          <Plus size={12} />
          ajouter un filtre
        </button>
        <span className="text-ui-border mx-1">|</span>
        <button className="underline text-ui-text-muted text-xs hover:text-ui-text transition-colors">
          Réinitialiser
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-cyprus-900 text-white text-sm">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" className="rounded" />
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
            {MOCK_LOTS.map((lot) => (
              <tr key={lot.id} className="border-b border-ui-border text-sm hover:bg-ui-bg-elevated/50 transition-colors">
                <td className="px-4 py-3">
                  <input type="checkbox" className="rounded" />
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
                  <button className="bg-vert-400 text-cyprus-900 rounded-md size-7 flex items-center justify-center hover:bg-vert-300 transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 flex items-center justify-between text-xs text-ui-text-muted border-t border-ui-border">
        <span>40-50 Sur 150 biens</span>
        <div className="flex items-center gap-2">
          <span>Affichage des resultats</span>
          <button className="border border-ui-border rounded-md px-2 py-1 flex items-center gap-1 text-ui-text">
            10 <ChevronDown size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
