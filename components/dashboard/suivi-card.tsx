'use client';

import { Eye, Download } from 'lucide-react';
import { MOCK_SUIVI } from '@/lib/mock/data';
import { useToast } from '@/components/ui/toast';

export default function SuiviCard() {
  const toast = useToast();

  return (
    <div className="bg-white rounded-lg border border-ui-border">
      <div className="p-5 pb-3 flex items-center gap-3">
        <img src="/assets/doc.webp" alt="" className="size-10" />
        <h2 className="text-lg font-semibold text-ui-text-highlighted">Suivi et documents utiles</h2>
      </div>
      <div className="px-3 pb-3 max-h-[320px] overflow-y-auto scrollbar-thin flex flex-col gap-2">
        {MOCK_SUIVI.map((item, index) => {
          const isLast = index === MOCK_SUIVI.length - 1;
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
