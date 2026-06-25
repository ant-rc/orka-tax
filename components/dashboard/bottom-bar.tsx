'use client';

import { Save } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useSelection } from '@/components/dashboard/selection-context';

// Présentationnel — la date de dernière modif n'est pas encore suivie côté données.
const LAST_MODIFIED_PLACEHOLDER = '09/12/2026';

export default function BottomBar() {
  const toast = useToast();
  const { selectedCount } = useSelection();
  const canGenerate = selectedCount > 0;

  return (
    <footer className="bg-white border-t border-ui-border px-8 py-4 flex items-center justify-between shrink-0">
      <span className="text-sm text-ui-text-muted">
        Dernière modification : {LAST_MODIFIED_PLACEHOLDER}
      </span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => toast('Modifications enregistrées', 'success')}
          className="border border-ui-border rounded-md px-4 py-2 text-sm flex items-center gap-1.5 text-ui-text hover:bg-ui-bg-elevated transition-colors"
        >
          <Save size={16} />
          Enregistrer
        </button>
        <button
          onClick={() => toast('Génération du rapport en cours…')}
          disabled={!canGenerate}
          title={canGenerate ? undefined : 'Sélectionnez au moins un lot ou un bien'}
          className="bg-vert-400 text-vert-900 rounded-md px-4 py-2 text-sm font-medium hover:bg-vert-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-vert-400"
          aria-label="Générer mon rapport"
        >
          Générer mon rapport
        </button>
      </div>
    </footer>
  );
}
