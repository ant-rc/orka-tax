'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  COMPARABLE_FIELDS,
  COMPARABLE_FIELD_LABELS as FIELD_LABELS,
  type ComparableField,
  type ComparableValues,
} from '@/lib/domain/comparable';
import ConfirmBulkEditModal from '@/components/dashboard/confirm-bulk-edit-modal';

export interface BulkEditBien {
  id: string;
  type: string;
  reference: string;
  surface: string;
  etage: string;
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

/** Shared value of `field` across the checked biens, as a string for inputs.
 *  Empty string when the checked biens disagree (mixed) or there is no value. */
function commonValue(
  biens: BulkEditBien[],
  checkedIds: Set<string>,
  field: ComparableField,
): string {
  const checked = biens.filter((b) => checkedIds.has(b.id));
  if (checked.length === 0) return '';
  const first = checked[0].values[field];
  if (!checked.every((b) => b.values[field] === first)) return '';
  if (first === null || first === undefined) return '';
  return String(first);
}

export default function BulkEditModal({
  open,
  biens,
  onClose,
  onApply,
}: BulkEditModalProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<ComparableField>>(new Set());
  const [applying, setApplying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Reset state when modal opens; pre-check every pre-selected bien and pre-fill
  // each field with the common value across the selection.
  useEffect(() => {
    if (!open) return;
    const ids = new Set(biens.map((b) => b.id));
    const initial: Record<string, string> = {};
    for (const f of COMPARABLE_FIELDS) initial[f] = commonValue(biens, ids, f);
    setCheckedIds(ids);
    setFieldValues(initial);
    setDirty(new Set());
    setApplying(false);
    setConfirmOpen(false);
  }, [open, biens]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Group biens by signature (identical biens shown together).
  const groups = useMemo(() => {
    const map = new Map<string, BulkEditBien[]>();
    for (const bien of biens) {
      const existing = map.get(bien.signature);
      if (existing) existing.push(bien);
      else map.set(bien.signature, [bien]);
    }
    return map;
  }, [biens]);

  // Breakdown of the checked biens by type (e.g. 11 appartements, 3 caves).
  const selectionByType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const bien of biens) {
      if (checkedIds.has(bien.id)) counts.set(bien.type, (counts.get(bien.type) ?? 0) + 1);
    }
    return [...counts.entries()].map(([type, count]) => ({ type, count }));
  }, [biens, checkedIds]);

  if (!open) return null;

  const toggleBien = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleGroup = (groupBiens: BulkEditBien[]) => {
    const allChecked = groupBiens.every((b) => checkedIds.has(b.id));
    setCheckedIds((prev) => {
      const next = new Set(prev);
      for (const b of groupBiens) { if (allChecked) next.delete(b.id); else next.add(b.id); }
      return next;
    });
  };

  const changeField = (field: ComparableField, value: string) => {
    setFieldValues((prev) => ({ ...prev, [field]: value }));
    setDirty((prev) => new Set(prev).add(field));
  };

  const handleApply = async () => {
    if (checkedIds.size === 0 || dirty.size === 0 || applying) return;
    const patch: Partial<ComparableValues> = {};
    for (const field of dirty) {
      const raw = fieldValues[field] ?? '';
      if (BOOLEAN_FIELDS.has(field)) {
        (patch as Record<string, unknown>)[field] = raw === '' ? null : raw === 'true';
      } else {
        const n = parseFloat(raw);
        (patch as Record<string, unknown>)[field] = raw === '' || Number.isNaN(n) ? null : n;
      }
    }
    setApplying(true);
    try {
      await onApply([...checkedIds], patch);
      onClose();
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-lg w-full max-w-3xl flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border shrink-0">
            <h2 className="text-base font-semibold text-ui-text-highlighted">Modification en masse</h2>
            <button onClick={onClose} className="text-ui-text-muted hover:text-ui-text transition-colors" aria-label="Fermer">
              <X size={18} />
            </button>
          </div>

          {/* Body: biens (left) + editable fields (right) */}
          <div className="flex-1 overflow-y-auto px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: biens recap with checkboxes */}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-vert-900">Biens sélectionnés</p>
              {[...groups.entries()].map(([signature, groupBiens]) => {
                const allChecked = groupBiens.every((b) => checkedIds.has(b.id));
                const someChecked = groupBiens.some((b) => checkedIds.has(b.id));
                const first = groupBiens[0];
                return (
                  <div key={signature} className="border border-ui-border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 bg-ui-bg-elevated px-3 py-2">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                        onChange={() => toggleGroup(groupBiens)}
                        className="shrink-0"
                        aria-label="Tout cocher le groupe"
                      />
                      <span className="text-sm font-medium text-vert-900 truncate flex-1">{first.label}</span>
                      <span className="text-xs text-ui-text-muted shrink-0">{groupBiens.length} bien{groupBiens.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex flex-col divide-y divide-ui-border">
                      {groupBiens.map((bien) => (
                        <label key={bien.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-ui-bg-elevated transition-colors">
                          <input type="checkbox" checked={checkedIds.has(bien.id)} onChange={() => toggleBien(bien.id)} className="shrink-0" />
                          <span className="flex flex-col min-w-0">
                            <span className="text-sm text-ui-text truncate">{bien.type} · {bien.surface}</span>
                            <span className="text-xs text-ui-text-muted truncate">ID {bien.reference} · Étage {bien.etage}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: all editable fields at once */}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-vert-900">Champs à modifier</p>
              <div className="flex flex-col gap-2.5">
                {COMPARABLE_FIELDS.map((field) => {
                  const isBoolean = BOOLEAN_FIELDS.has(field);
                  const value = fieldValues[field] ?? '';
                  const mixed = value === '' && !dirty.has(field);
                  return (
                    <div key={field} className="flex items-center gap-3">
                      <label className="text-sm text-vert-900 flex-1 truncate">{FIELD_LABELS[field]}</label>
                      {isBoolean ? (
                        <select
                          value={value}
                          onChange={(e) => changeField(field, e.target.value)}
                          className={`w-32 border rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-vert-500 ${dirty.has(field) ? 'border-vert-500 text-vert-900' : 'border-ui-border text-ui-text-muted'}`}
                        >
                          <option value="">{mixed ? '— (varié)' : '—'}</option>
                          <option value="true">Oui</option>
                          <option value="false">Non</option>
                        </select>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={value}
                          placeholder={mixed ? 'Varié' : '—'}
                          onChange={(e) => changeField(field, e.target.value)}
                          className={`w-32 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-vert-500 ${dirty.has(field) ? 'border-vert-500 text-vert-900' : 'border-ui-border text-ui-text'}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-ui-text-muted">Seuls les champs que vous modifiez seront appliqués.</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-ui-border shrink-0">
            <button onClick={onClose} className="border border-black rounded-lg px-2.5 py-1.5 text-sm text-vert-900 hover:bg-ui-bg-elevated transition-colors">
              Annuler
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={checkedIds.size === 0 || dirty.size === 0 || applying}
              className="bg-vert-400 text-vert-900 rounded-lg px-2.5 py-1.5 text-sm font-medium hover:bg-vert-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>

      <ConfirmBulkEditModal
        open={confirmOpen}
        breakdown={selectionByType}
        applying={applying}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleApply}
      />
    </>
  );
}
