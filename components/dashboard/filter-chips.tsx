import { Plus, X } from 'lucide-react';
import { MOCK_FILTERS } from '@/lib/mock/data';

export default function FilterChips() {
  return (
    <div className="px-5 py-3 flex items-center gap-2 flex-wrap text-sm border-b border-ui-border">
      {MOCK_FILTERS.map((filter) => (
        <span
          key={filter}
          className="bg-ui-bg-elevated border border-ui-border rounded-md px-2 py-1 text-xs flex items-center gap-1 text-ui-text"
        >
          {filter}
          <button className="text-ui-text-muted hover:text-ui-text transition-colors" aria-label={`Retirer ${filter}`}>
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
  );
}
