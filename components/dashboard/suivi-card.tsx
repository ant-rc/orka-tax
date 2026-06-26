'use client';

import { Eye, Download } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface SuiviItem {
  id: string;
  date: string;
  label: string;
  hasDownload: boolean;
}

// Documents du dossier de dégrèvement, du plus récent au plus ancien.
const SUIVI_ITEMS: SuiviItem[] = [
  { id: '1', date: '17/07/2026', label: 'Décision de dégrèvement — DGFiP', hasDownload: true },
  { id: '2', date: '30/06/2026', label: 'Réclamation taxe foncière déposée', hasDownload: true },
  { id: '3', date: '26/06/2026', label: 'Rapport de vérification ORKA', hasDownload: true },
  { id: '4', date: '03/02/2026', label: 'Plan de surface (loi Carrez)', hasDownload: false },
  { id: '5', date: '12/01/2026', label: 'Extrait de matrice cadastrale', hasDownload: false },
  { id: '6', date: '12/01/2026', label: 'Relevé de propriété', hasDownload: false },
  { id: '7', date: '15/09/2025', label: 'Avis de taxe foncière 2025', hasDownload: true },
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
        {SUIVI_ITEMS.map((item) => {
          return (
            <div
              key={item.id}
              className="bg-ui-bg-elevated rounded-md px-4 py-3 flex items-center justify-between"
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
