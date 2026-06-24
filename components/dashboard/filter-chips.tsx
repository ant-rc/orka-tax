'use client';

import { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';

interface FilterChipsProps {
  filters: string[];
  onRemove: (f: string) => void;
  onReset: () => void;
  onAdd: (value: string) => void;
}

export default function FilterChips({ filters, onRemove, onReset, onAdd }: FilterChipsProps) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');

  const cancel = () => {
    setAdding(false);
    setValue('');
  };

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onAdd(v);
    cancel();
  };

  return (
    <div className="px-5 py-3 flex items-center gap-2 flex-wrap text-sm border-b border-ui-border">
      {filters.map((filter) => (
        <span
          key={filter}
          className="bg-ui-bg-elevated border border-ui-border rounded-md px-2 py-1 text-xs flex items-center gap-1 text-ui-text"
        >
          {filter}
          <button
            onClick={() => onRemove(filter)}
            className="text-ui-text-muted hover:text-ui-text transition-colors"
            aria-label={`Retirer ${filter}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}

      {adding ? (
        <span className="flex items-center gap-1">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') cancel();
            }}
            onBlur={cancel}
            placeholder="Valeur du filtre"
            className="border border-ui-border rounded-md px-2 py-1 text-xs w-36 text-ui-text placeholder:text-ui-text-dimmed focus:outline-none focus:border-ui-border-accented"
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
