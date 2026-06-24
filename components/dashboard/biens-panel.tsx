import { ArrowDownUp, ChevronDown, Trash2 } from 'lucide-react';
import { MOCK_BIENS } from '@/lib/mock/data';
import PanelToolbar from '@/components/dashboard/panel-toolbar';
import FilterChips from '@/components/dashboard/filter-chips';
import StatusBadge from '@/components/dashboard/status-badge';

const COLUMNS = ['Vos biens', 'ID', 'Surfaces', 'Étage', 'Dégrèvement estimés', 'Statut'];

export default function BiensPanel() {
  return (
    <div className="bg-white rounded-lg border border-ui-border shadow-sm overflow-hidden flex flex-col">
      <PanelToolbar primaryLabel="Ajouter un bien" />
      <FilterChips />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-cyprus-900 text-white text-sm">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" className="rounded" aria-label="Tout sélectionner" />
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
            {MOCK_BIENS.map((bien) => (
              <tr key={bien.id} className="border-b border-ui-border text-sm hover:bg-ui-bg-elevated/50 transition-colors">
                <td className="px-4 py-3">
                  <input type="checkbox" className="rounded" aria-label={`Sélectionner ${bien.reference}`} />
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
                      className="text-error hover:bg-error/10 rounded-md size-7 flex items-center justify-center transition-colors"
                      aria-label={`Supprimer ${bien.reference}`}
                    >
                      <Trash2 size={16} />
                    </button>
                    <button className="bg-vert-400 text-vert-900 rounded-md px-4 py-1.5 text-sm font-medium hover:bg-vert-300 transition-colors">
                      Voir
                    </button>
                  </div>
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
