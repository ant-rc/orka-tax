'use client';

import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { useSelection } from '@/components/dashboard/selection-context';

const LAST_MODIFIED_PLACEHOLDER = '09/12/2026';

export default function BottomBar() {
  const toast = useToast();
  const router = useRouter();
  const { selectedCount, anomalieCount } = useSelection();
  const canGenerate = selectedCount > 0 || anomalieCount > 0;

  const handleGenerate = () => {
    if (anomalieCount > 0) {
      sessionStorage.setItem('filter_anomalie', '1');
      router.push('/manage-anomalies');
    } else {
      toast('Génération du rapport en cours…');
    }
  };

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
          onClick={handleGenerate}
          disabled={!canGenerate}
          title={canGenerate ? undefined : 'Sélectionnez au moins un lot ou un bien, ou importez un fichier pour détecter des anomalies'}
          className="bg-vert-400 text-vert-900 rounded-md px-4 py-2 text-sm font-medium hover:bg-vert-300 transition-colors disabled:bg-ui-border disabled:text-ui-text-dimmed disabled:cursor-not-allowed disabled:hover:bg-ui-border"
          aria-label="Générer mon rapport"
        >
          {anomalieCount > 0
            ? `Générer mon rapport (${anomalieCount})`
            : 'Générer mon rapport'}
        </button>
      </div>
    </footer>
  );
}
