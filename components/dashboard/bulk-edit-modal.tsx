'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { COMPARABLE_FIELDS, type ComparableField, type ComparableValues } from '@/lib/domain/comparable';

export interface BulkEditBien {
  id: string;
  signature: string;
  label: string;
  values: ComparableValues;
}

interface BulkEditModalProps {
  open: boolean;
  biens: BulkEditBien[];
  onClose: () => void;
  onApply: (bienIds: string[], patch: Partial<ComparableValues>) => Promise<void>;
}

const BOOLEAN_FIELDS: ReadonlySet<ComparableField> = new Set<ComparableField>([
  'ascenseur',
  'eau_courante',
  'gaz',
  'electricite',
]);

const FIELD_LABELS: Record<ComparableField, string> = {
  surface_m2: 'Surface (m²)',
  nb_pieces: 'Nb pièces',
  nb_wc: 'Nb WC',
  nb_baignoires: 'Nb baignoires',
  nb_douches: 'Nb douches',
  nb_bidets: 'Nb bidets',
  nb_eviers: 'Nb éviers',
  ascenseur: 'Ascenseur',
  eau_courante: 'Eau courante',
  gaz: 'Gaz',
  electricite: 'Électricité',
};

export default function BulkEditModal({
  open,
  biens,
  onClose,
  onApply,
}: BulkEditModalProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [field, setField] = useState<ComparableField>(COMPARABLE_FIELDS[0]);
  const [rawValue, setRawValue] = useState<string>('');
  const [applying, setApplying] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCheckedIds(new Set());
      setField(COMPARABLE_FIELDS[0]);
      setRawValue('');
      setApplying(false);
    }
  }, [open]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Group biens by signature
  const groups = useMemo(() => {
    const map = new Map<string, BulkEditBien[]>();
    for (const bien of biens) {
      const existing = map.get(bien.signature);
      if (existing) {
        existing.push(bien);
      } else {
        map.set(bien.signature, [bien]);
      }
    }
    return map;
  }, [biens]);

  if (!open) return null;

  const isBoolean = BOOLEAN_FIELDS.has(field);

  const toggleBien = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleGroup = (groupBiens: BulkEditBien[]) => {
    const allChecked = groupBiens.every((b) => checkedIds.has(b.id));
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        for (const b of groupBiens) next.delete(b.id);
      } else {
        for (const b of groupBiens) next.add(b.id);
      }
      return next;
    });
  };

  const handleApply = async () => {
    if (checkedIds.size === 0 || applying) return;

    let parsedValue: number | boolean | null = null;
    if (isBoolean) {
      parsedValue = rawValue === 'true';
    } else {
      const n = parseFloat(rawValue);
      parsedValue = isNaN(n) ? null : n;
    }

    const patch: Partial<ComparableValues> = { [field]: parsedValue };

    setApplying(true);
    try {
      await onApply([...checkedIds], patch);
      onClose();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-lg w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border shrink-0">
          <h2 className="text-base font-semibold text-ui-text-highlighted">
            Modification en masse
          </h2>
          <button
            onClick={onClose}
            className="text-ui-text-muted hover:text-ui-text transition-colors"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {/* Groups */}
          <div className="flex flex-col gap-3">
            {[...groups.entries()].map(([signature, groupBiens]) => {
              const firstBien = groupBiens[0];
              const allChecked = groupBiens.every((b) => checkedIds.has(b.id));
              const someChecked = groupBiens.some((b) => checkedIds.has(b.id));

              return (
                <div key={signature} className="border border-ui-border rounded-lg overflow-hidden">
                  {/* Group header */}
                  <div className="flex items-center gap-2 bg-ui-bg-elevated px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = someChecked && !allChecked;
                      }}
                      onChange={() => toggleGroup(groupBiens)}
                      className="shrink-0"
                      aria-label="Tout cocher le groupe"
                    />
                    <span className="text-sm font-medium text-vert-900 truncate flex-1">
                      {firstBien.label}
                    </span>
                    <span className="text-xs text-ui-text-muted shrink-0">
                      {groupBiens.length} bien{groupBiens.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Per-bien checkboxes */}
                  <div className="flex flex-col divide-y divide-ui-border">
                    {groupBiens.map((bien) => (
                      <label
                        key={bien.id}
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-ui-bg-elevated transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checkedIds.has(bien.id)}
                          onChange={() => toggleBien(bien.id)}
                          className="shrink-0"
                        />
                        <span className="text-sm text-ui-text truncate">{bien.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Field + value */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-vert-900">Champ à modifier</p>
            <div className="flex gap-2">
              <select
                value={field}
                onChange={(e) => {
                  setField(e.target.value as ComparableField);
                  setRawValue('');
                }}
                className="flex-1 border border-ui-border rounded-lg px-3 py-1.5 text-sm text-vert-900 bg-white focus:outline-none focus:ring-2 focus:ring-vert-500"
              >
                {COMPARABLE_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {FIELD_LABELS[f]}
                  </option>
                ))}
              </select>

              {isBoolean ? (
                <select
                  value={rawValue}
                  onChange={(e) => setRawValue(e.target.value)}
                  className="w-32 border border-ui-border rounded-lg px-3 py-1.5 text-sm text-vert-900 bg-white focus:outline-none focus:ring-2 focus:ring-vert-500"
                >
                  <option value="">--</option>
                  <option value="true">Oui</option>
                  <option value="false">Non</option>
                </select>
              ) : (
                <input
                  type="number"
                  value={rawValue}
                  onChange={(e) => setRawValue(e.target.value)}
                  placeholder="Valeur"
                  min={0}
                  className="w-32 border border-ui-border rounded-lg px-3 py-1.5 text-sm text-vert-900 focus:outline-none focus:ring-2 focus:ring-vert-500"
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-ui-border shrink-0">
          <button
            onClick={onClose}
            className="border border-black rounded-lg px-2.5 py-1.5 text-sm text-vert-900 hover:bg-ui-bg-elevated transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleApply}
            disabled={checkedIds.size === 0 || applying || rawValue === ''}
            className="bg-vert-700 text-white rounded-lg px-2.5 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {applying ? 'Application…' : 'Appliquer'}
          </button>
        </div>
      </div>
    </div>
  );
}
