import Link from 'next/link';
import { ArrowDownUp, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { MOCK_LOTS } from '@/lib/mock/data';
import PanelToolbar from '@/components/dashboard/panel-toolbar';
import FilterChips from '@/components/dashboard/filter-chips';

export default function LotsPanel() {
  return (
    <div className="bg-white rounded-lg border border-ui-border shadow-sm overflow-hidden flex flex-col">
      <PanelToolbar primaryLabel="Créer un lot" />
      <FilterChips />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-cyprus-900 text-white text-sm">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" className="rounded" aria-label="Tout sélectionner" />
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
                  <input type="checkbox" className="rounded" aria-label={`Sélectionner ${lot.name}`} />
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
