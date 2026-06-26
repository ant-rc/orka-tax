'use client';

import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Hash, Ruler, Building2, MapPin } from 'lucide-react';
import {
  COMPARABLE_FIELDS,
  COMPARABLE_FIELD_LABELS,
  type ComparableField,
  type ComparableValues,
} from '@/lib/domain/comparable';
import { BIEN_TYPE_ICON, type Bien } from '@/lib/domain/property';

export interface PreviewBien {
  bien: Bien;
  values: ComparableValues | null;
}

interface BienPreviewModalProps {
  open: boolean;
  items: PreviewBien[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}

const NUMERIC_FIELDS = new Set<ComparableField>(['surface_m2', 'nb_pieces', 'nb_wc', 'nb_baignoires', 'nb_douches', 'nb_bidets', 'nb_eviers']);
const BOOLEAN_FIELDS = new Set<ComparableField>(['ascenseur', 'eau_courante', 'gaz', 'electricite']);

function formatValue(field: ComparableField, v: number | boolean | null | undefined): string {
  if (v === null || v === undefined) return '—';
  if (BOOLEAN_FIELDS.has(field)) return v ? 'Oui' : 'Non';
  return field === 'surface_m2' ? `${v} m²` : String(v);
}

function CriteriaRow({ field, values }: { field: ComparableField; values: ComparableValues | null }) {
  return (
    <tr className="border-b border-ui-border text-sm">
      <td className="px-4 py-3 text-vert-900 w-1/3">{COMPARABLE_FIELD_LABELS[field]}</td>
      <td className="px-4 py-3 font-medium text-vert-900">{formatValue(field, values ? values[field] : null)}</td>
    </tr>
  );
}

export default function BienPreviewModal({ open, items, index, onIndexChange, onClose }: BienPreviewModalProps) {
  const current = items[index];

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
      else if (e.key === 'ArrowRight' && index < items.length - 1) onIndexChange(index + 1);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, index, items.length, onIndexChange, onClose]);

  if (!open || !current) return null;

  const { bien, values } = current;
  const numericFields = COMPARABLE_FIELDS.filter((f) => NUMERIC_FIELDS.has(f));
  const equipmentFields = COMPARABLE_FIELDS.filter((f) => BOOLEAN_FIELDS.has(f));

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-lg w-full max-w-5xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="bg-cyprus-900 flex items-center justify-between px-5 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="bg-white rounded-md p-1 flex items-center justify-center">
              <img src={BIEN_TYPE_ICON[bien.type]} alt="" className="size-6" />
            </span>
            <span className="text-base font-medium text-white">{bien.type}</span>
          </div>
          <button
            onClick={onClose}
            className="bg-white/15 hover:bg-white/25 text-white rounded-full size-8 flex items-center justify-center transition-colors"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col lg:flex-row gap-6">
          {/* Main: criteria table */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-ui-text-highlighted">Aperçue de votre bien</h2>
            <div className="bg-white border border-ui-border rounded-lg overflow-hidden">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-cyprus-900 text-white text-sm">
                    <th className="text-left px-4 py-3 font-medium">Critères</th>
                    <th className="text-left px-4 py-3 font-medium">Vos données</th>
                  </tr>
                </thead>
                <tbody>
                  {numericFields.map((f) => <CriteriaRow key={f} field={f} values={values} />)}
                  <tr>
                    <td colSpan={2} className="px-4 pt-4 pb-2 text-xs font-medium tracking-wide text-ui-text-muted uppercase">
                      Équipements
                    </td>
                  </tr>
                  {equipmentFields.map((f) => <CriteriaRow key={f} field={f} values={values} />)}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-80 shrink-0">
            <div className="bg-white border border-ui-border rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="bg-ui-bg-elevated rounded-md p-1 flex items-center justify-center">
                  <img src={BIEN_TYPE_ICON[bien.type]} alt="" className="size-6" />
                </span>
                <span className="text-base font-medium text-vert-900">{bien.type}</span>
              </div>
              <ul className="flex flex-col gap-2 text-sm text-vert-900">
                <li className="flex items-center gap-2"><Hash size={16} className="text-ui-text-muted" /> ID : {bien.reference}</li>
                <li className="flex items-center gap-2"><Ruler size={16} className="text-ui-text-muted" /> {bien.surface}</li>
                <li className="flex items-center gap-2"><Building2 size={16} className="text-ui-text-muted" /> Étage : {bien.etage}</li>
                {bien.address && <li className="flex items-center gap-2"><MapPin size={16} className="text-ui-text-muted" /> {bien.address}</li>}
              </ul>
            </div>
          </aside>
        </div>

        {/* Footer: current bien + navigation arrows */}
        <div className="border-t border-ui-border px-6 py-3 flex items-center justify-end gap-4 shrink-0">
          <span className="text-sm text-ui-text-muted truncate">
            {bien.type} / ID : {bien.reference}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onIndexChange(index - 1)}
              disabled={index <= 0}
              aria-label="Bien précédent"
              className="border border-ui-border rounded-md size-8 flex items-center justify-center text-ui-text hover:bg-ui-bg-elevated transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => onIndexChange(index + 1)}
              disabled={index >= items.length - 1}
              aria-label="Bien suivant"
              className="border border-ui-border rounded-md size-8 flex items-center justify-center text-ui-text hover:bg-ui-bg-elevated transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
