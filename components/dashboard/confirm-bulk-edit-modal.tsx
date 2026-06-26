'use client';

import { useEffect } from 'react';
import { Info, Check } from 'lucide-react';

interface TypeBreakdown {
  type: string;
  count: number;
}

interface ConfirmBulkEditModalProps {
  open: boolean;
  breakdown: TypeBreakdown[];
  applying?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** "11 appartements", "1 cave" — lowercased type, naive French plural (+s). */
function formatPart({ type, count }: TypeBreakdown): string {
  const noun = count > 1 ? `${type.toLowerCase()}s` : type.toLowerCase();
  return `${count} ${noun}`;
}

export default function ConfirmBulkEditModal({
  open,
  breakdown,
  applying = false,
  onConfirm,
  onClose,
}: ConfirmBulkEditModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const total = breakdown.reduce((s, b) => s + b.count, 0);
  const plural = total > 1 ? 's' : '';
  const summary = breakdown.map(formatPart).join(', ');

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-lg w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top section */}
        <div className="flex gap-[18px] items-start p-4 border-b border-ui-border">
          <span className="flex items-center justify-center size-8 shrink-0 rounded-lg bg-info/10 border border-info">
            <Info size={18} className="text-info" />
          </span>
          <div className="flex flex-col gap-1 min-w-0 text-vert-900">
            <p className="text-base font-medium">Modification des biens</p>
            <p className="text-sm">
              Appliquer mon choix pour{' '}
              <span className="font-bold">les {summary}</span>{' '}
              sélectionné{plural}.
            </p>
          </div>
        </div>
        {/* Footer */}
        <div className="flex gap-2 items-center justify-end p-3">
          <button
            onClick={onClose}
            className="border border-black rounded-lg px-2.5 py-1.5 text-sm text-vert-900 hover:bg-ui-bg-elevated transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={applying}
            className="bg-vert-400 text-vert-900 rounded-lg px-2.5 py-1.5 text-sm font-medium flex items-center gap-1.5 hover:bg-vert-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={18} />
            {applying ? 'Application…' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  );
}
