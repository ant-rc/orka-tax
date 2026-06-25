'use client';

import { Eye, Download } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface SuiviItem {
  id: string;
  date: string;
  label: string;
  hasDownload: boolean;
}

// Présentationnel — le suivi documentaire n'est pas encore branché côté données.
const SUIVI_PLACEHOLDER: SuiviItem[] = [
  { id: '1', date: '17/07/2026', label: 'lorem ipsum', hasDownload: false },
  { id: '2', date: '17/07/2026', label: 'lorem ipsum', hasDownload: false },
  { id: '3', date: '17/07/2026', label: 'lorem ipsum', hasDownload: false },
  { id: '4', date: '17/07/2026', label: 'lorem ipsum', hasDownload: false },
  { id: '5', date: '17/07/2026', label: 'lorem ipsum', hasDownload: true },
  { id: '6', date: '17/07/2026', label: 'lorem ipsum', hasDownload: false },
  { id: '7', date: '17/07/2026', label: 'lorem ipsum', hasDownload: false },
];

export default function SuiviCard() {
  const toast = useToast();

  return (
    <div className="bg-white rounded-lg border border-ui-border">
      <div className="p-5 pb-3 flex items-center gap-3">
        <img src="/assets/doc.webp" alt="" className="size-10" />
        <h2 className="text-lg font-semibold text-ui-text-highlighted">Suivi et documents utiles</h2>
      </div>
      <div className="px-3 pb-3 max-h-[320px] overflow-y-auto scrollbar-thin flex flex-col gap-2">
        {SUIVI_PLACEHOLDER.map((item, index) => {
          const isLast = index === SUIVI_PLACEHOLDER.length - 1;
          return (
            <div
              key={item.id}
              className={`bg-ui-bg-elevated rounded-md px-4 py-3 flex items-center justify-between${isLast ? ' opacity-60' : ''}`}
            >
              <div>
                <p className="text-sm font-semibold text-ui-text-highlighted">{item.date}</p>
                <p className="text-xs text-ui-text-muted">{item.label}</p>
              </div>
              <div className="flex items-center gap-2">
                {item.hasDownload && (
                  <button
                    onClick={() => toast('Téléchargement du document')}
                    className="text-ui-text-muted hover:text-ui-text transition-colors"
                    aria-label="Télécharger le document"
                  >
                    <Download size={16} />
                  </button>
                )}
                <button
                  onClick={() => toast('Aperçu du document')}
                  className="text-ui-text-muted hover:text-ui-text transition-colors"
                  aria-label="Aperçu du document"
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
