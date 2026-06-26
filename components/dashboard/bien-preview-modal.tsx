'use client';

import { useEffect } from 'react';
import { X, Hash, Ruler, Building2 } from 'lucide-react';
import {
  COMPARABLE_FIELDS,
  COMPARABLE_FIELD_LABELS,
  type ComparableField,
  type ComparableValues,
} from '@/lib/domain/comparable';
import { BIEN_TYPE_ICON, type Bien } from '@/lib/domain/property';
import StatusBadge from './status-badge';

interface BienPreviewModalProps {
  open: boolean;
  bien: Bien | null;
  values: ComparableValues | null;
  onClose: () => void;
}

const BOOLEAN_FIELDS: ReadonlySet<ComparableField> = new Set<ComparableField>([
  'ascenseur', 'eau_courante', 'gaz', 'electricite',
]);

function formatValue(field: ComparableField, v: number | boolean | null): string {
  if (v === null || v === undefined) return '—';
  if (BOOLEAN_FIELDS.has(field)) return v ? 'Oui' : 'Non';
  return field === 'surface_m2' ? `${v} m²` : String(v);
}

export default function BienPreviewModal({ open, bien, values, onClose }: BienPreviewModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !bien) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-lg w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border shrink-0">
          <h2 className="text-base font-semibold text-ui-text-highlighted">Aperçu du bien</h2>
          <button onClick={onClose} className="text-ui-text-muted hover:text-ui-text transition-colors" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        {/* Body (read-only) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <img src={BIEN_TYPE_ICON[bien.type]} alt="" className="size-8 shrink-0" />
              <span className="text-base font-medium text-vert-900">{bien.type}</span>
              <span className="ms-auto"><StatusBadge statut={bien.statut} /></span>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-vert-900">
              <li className="flex items-center gap-2"><Hash size={16} className="text-ui-text-muted" /> ID : {bien.reference}</li>
              <li className="flex items-center gap-2"><Ruler size={16} className="text-ui-text-muted" /> {bien.surface}</li>
              <li className="flex items-center gap-2"><Building2 size={16} className="text-ui-text-muted" /> Étage : {bien.etage}</li>
            </ul>
          </div>

          <div className="border-t border-ui-border pt-4">
            <p className="text-xs font-medium tracking-wide text-ui-text-muted uppercase mb-2">Caractéristiques</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              {COMPARABLE_FIELDS.map((field) => (
                <div key={field} className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-ui-text-muted truncate">{COMPARABLE_FIELD_LABELS[field]}</dt>
                  <dd className="text-vert-900 font-medium shrink-0">{formatValue(field, values ? values[field] : null)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
