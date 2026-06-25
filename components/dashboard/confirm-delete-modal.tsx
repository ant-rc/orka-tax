'use client';

import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';

interface ConfirmDeleteModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDeleteModal({
  open,
  title,
  description,
  confirmLabel = 'Supprimer',
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-lg w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top section */}
        <div className="flex gap-[18px] items-start p-4 border-b border-ui-border">
          <span className="flex items-center justify-center size-8 shrink-0 rounded-lg bg-error/10 border border-error">
            <TriangleAlert size={18} className="text-error" />
          </span>
          <div className="flex flex-col gap-2 min-w-0">
            <p className="text-base font-medium text-vert-900">{title}</p>
            {description && (
              <p className="text-sm text-ui-text whitespace-pre-line">{description}</p>
            )}
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
            className="bg-error text-white rounded-lg px-2.5 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
