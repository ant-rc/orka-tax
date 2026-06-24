import { Save } from 'lucide-react';
import { MOCK_LAST_MODIFIED } from '@/lib/mock/data';

export default function BottomBar() {
  return (
    <footer className="bg-white border-t border-ui-border px-8 py-4 flex items-center justify-between shrink-0">
      <span className="text-sm text-ui-text-muted">
        Dernière modification : {MOCK_LAST_MODIFIED}
      </span>
      <div className="flex items-center gap-3">
        <button className="border border-ui-border rounded-md px-4 py-2 text-sm flex items-center gap-1.5 text-ui-text hover:bg-ui-bg-elevated transition-colors">
          <Save size={16} />
          Enregistrer
        </button>
        <button
          disabled
          className="bg-ui-bg-elevated text-ui-text-dimmed rounded-md px-4 py-2 text-sm cursor-not-allowed"
        >
          Générer mon rapport
        </button>
      </div>
    </footer>
  );
}
