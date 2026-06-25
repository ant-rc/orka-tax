'use client';

import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import type { ActiveFilter, FieldDef } from '@/lib/table/filters';

interface FilterChipsProps {
  fields: FieldDef[];
  filters: ActiveFilter[];
  onAdd: (field: FieldDef, value: string) => void;
  onRemove: (id: string) => void;
  onReset: () => void;
}

export default function FilterChips({ fields, filters, onAdd, onRemove, onReset }: FilterChipsProps) {
  const [adding, setAdding] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>(fields[0]?.key ?? '');
  const [value, setValue] = useState('');

  const cancel = () => {
    setAdding(false);
    setValue('');
    setSelectedKey(fields[0]?.key ?? '');
  };

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    const field = fields.find((f) => f.key === selectedKey);
    if (!field) return;
    onAdd(field, v);
    cancel();
  };

  return (
    <div className="bg-ui-bg-elevated border-y border-ui-border mb-4 px-5 py-3 flex items-center gap-2 flex-wrap text-sm">
      {filters.map((filter) => (
        <span
          key={filter.id}
          className="bg-ui-bg-elevated border border-ui-border rounded-md px-2 py-1 text-xs flex items-center gap-1 text-ui-text"
        >
          <span className="font-medium">{filter.label}</span>:&nbsp;{filter.value}
          <button
            onClick={() => onRemove(filter.id)}
            className="text-ui-text-muted hover:text-ui-text transition-colors"
            aria-label={`Retirer le filtre ${filter.label}: ${filter.value}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}

      {adding ? (
        <span className="flex items-center gap-1">
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="border border-ui-border rounded-md px-2 py-1 text-xs text-ui-text focus:outline-none focus:border-ui-border-accented"
          >
            {fields.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') cancel();
            }}
            placeholder="Valeur"
            className="border border-ui-border rounded-md px-2 py-1 text-xs w-28 text-ui-text placeholder:text-ui-text-dimmed focus:outline-none focus:border-ui-border-accented"
          />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={submit}
            className="text-success hover:opacity-70 transition-opacity"
            aria-label="Valider le filtre"
          >
            <Check size={14} />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={cancel}
            className="text-ui-text-muted hover:text-ui-text transition-colors"
            aria-label="Annuler le filtre"
          >
            <X size={14} />
          </button>
        </span>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-ui-text-muted flex items-center gap-1 text-xs hover:text-ui-text transition-colors"
        >
          <Plus size={12} />
          ajouter un filtre
        </button>
      )}

      <span className="text-ui-border mx-1">|</span>
      <button
        onClick={onReset}
        className="underline text-ui-text-muted text-xs hover:text-ui-text transition-colors"
      >
        Réinitialiser
      </button>
    </div>
  );
}
