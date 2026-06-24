'use client';

import { Search, Download, Plus } from 'lucide-react';
import { MOCK_COUNTS } from '@/lib/mock/data';

interface PanelToolbarProps {
  primaryLabel: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  onPrimary: () => void;
  onImport: () => void;
}

export default function PanelToolbar({
  primaryLabel,
  searchValue,
  onSearchChange,
  onPrimary,
  onImport,
}: PanelToolbarProps) {
  return (
    <div className="p-5 flex items-center justify-between gap-4 flex-wrap border-b border-ui-border">
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold text-ui-text-highlighted">Configurations de vos biens</span>
        <span className="bg-vert-200 text-vert-900 rounded-md px-2 py-0.5 text-sm font-medium">
          {MOCK_COUNTS.configured} /{MOCK_COUNTS.total}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-text-dimmed" />
          <input
            type="text"
            placeholder="Chercher"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="border border-ui-border rounded-md pl-8 pr-3 py-2 text-sm w-full sm:w-60 text-ui-text placeholder:text-ui-text-dimmed focus:outline-none focus:border-ui-border-accented"
          />
        </div>
        <button
          onClick={onImport}
          className="border border-ui-border rounded-md px-3 py-2 text-sm flex items-center gap-1.5 text-ui-text hover:bg-ui-bg-elevated transition-colors"
        >
          <Download size={14} />
          Importer
        </button>
        <button
          onClick={onPrimary}
          className="bg-vert-400 text-vert-900 rounded-md px-3 py-2 text-sm font-medium flex items-center gap-1.5 hover:bg-vert-300 transition-colors"
        >
          <Plus size={14} />
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}
