'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Trash2 } from 'lucide-react';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  importing?: boolean;
  file: File | null;
  onFileChange: (file: File | null) => void;
  description?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}kb`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}mb`;
}

function fileExt(name: string): string {
  return name.split('.').pop()?.toUpperCase() ?? '';
}

export default function ImportModal({
  open,
  onClose,
  onConfirm,
  importing = false,
  file,
  onFileChange,
  description = 'Les biens seront mis à jour et les biens absents du fichier resteront inchangés.',
}: ImportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && /\.(csv|xlsx)$/i.test(dropped.name)) onFileChange(dropped);
  }, [onFileChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div className="flex items-start gap-3">
            <img src="/assets/icon-import-header.svg" alt="" className="size-10 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-ui-text-highlighted">Importation d'un fichier</h2>
              <p className="text-sm text-ui-text-muted mt-0.5">{description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ui-text-muted hover:text-ui-text transition-colors ml-2 shrink-0" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-5">
          {/* Template download */}
          <div>
            <p className="text-sm font-semibold text-ui-text-highlighted mb-2">Template à télécharger et à remplir</p>
            <a
              href="/assets/template-matrice.xlsx"
              download="Template Matrice.xlsx"
              className="flex items-center gap-3 border border-vert-400 rounded-xl px-4 py-3 hover:bg-vert-50 transition-colors group"
            >
              <img src="/assets/icon-file-xlsx.svg" alt="" className="size-10 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ui-text-highlighted">Template "biens"</p>
                <p className="text-xs text-ui-text-muted">14kb • XLSX</p>
              </div>
              <img src="/assets/icon-download-btn.svg" alt="" className="size-7 shrink-0" />
            </a>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors
              ${dragging ? 'border-vert-400 bg-vert-50' : 'border-ui-border hover:border-vert-400 hover:bg-vert-50/50'}`}
          >
            <img src="/assets/icon-file-xlsx.svg" alt="" className="size-16" />
            <div className="text-center">
              <p className="text-sm font-semibold text-ui-text-highlighted">Click pour importer ou drag and drop</p>
              <p className="text-xs text-ui-text-muted mt-0.5">Format du fichier : CSV ou XLSX.</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className="bg-vert-400 text-vert-900 rounded-lg px-5 py-2 text-sm font-semibold hover:bg-vert-300 transition-colors"
            >
              Sélectionner un fichier
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />

          {/* Selected file */}
          {file && (
            <div>
              <p className="text-sm font-semibold text-ui-text-highlighted mb-2">Fichier télécharger</p>
              <div className="flex items-center gap-3 border border-ui-border rounded-xl px-4 py-3">
                <img src="/assets/icon-file-xlsx.svg" alt="" className="size-10 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ui-text-highlighted truncate">{file.name}</p>
                  <p className="text-xs text-ui-text-muted">{formatSize(file.size)} • {fileExt(file.name)}</p>
                </div>
                <button
                  onClick={() => { onFileChange(null); if (inputRef.current) inputRef.current.value = ''; }}
                  className="text-error hover:bg-error/10 rounded-lg p-1.5 transition-colors shrink-0"
                  aria-label="Supprimer le fichier"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ui-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="border border-ui-border rounded-lg px-5 py-2 text-sm text-ui-text hover:bg-ui-bg-elevated transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={!file || importing}
            className="bg-vert-400 text-vert-900 rounded-lg px-5 py-2 text-sm font-semibold hover:bg-vert-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? 'Analyse…' : 'Importer'}
          </button>
        </div>
      </div>
    </div>
  );
}
