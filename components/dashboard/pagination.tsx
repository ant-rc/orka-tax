'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}

function buildPageWindow(current: number, total: number): (number | '…')[] {
  if (total <= 1) return [1];

  const set = new Set<number>([
    1,
    total,
    Math.max(1, current - 1),
    current,
    Math.min(total, current + 1),
  ]);

  const sorted = Array.from(set).sort((a, b) => a - b);
  const result: (number | '…')[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('…');
    }
    result.push(sorted[i]);
  }

  return result;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const window = buildPageWindow(page, totalPages);

  const btnBase =
    'border border-ui-border rounded-md size-8 flex items-center justify-center text-ui-text hover:bg-ui-bg-elevated transition-colors';

  return (
    <nav className="flex items-center gap-1" aria-label="Pagination">
      <button
        className={`${btnBase} ${page <= 1 ? 'opacity-40 cursor-not-allowed' : ''}`}
        onClick={() => { if (page > 1) onPageChange(page - 1); }}
        disabled={page <= 1}
        aria-label="Page précédente"
      >
        <ChevronLeft size={14} />
      </button>

      {window.map((item, idx) =>
        item === '…' ? (
          <span key={`ellipsis-${idx}`} className="text-ui-text-muted px-1 text-sm select-none">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={`size-8 rounded-md text-sm flex items-center justify-center transition-colors ${
              item === page
                ? 'bg-vert-400 text-cyprus-900 font-medium'
                : 'text-ui-text hover:bg-ui-bg-elevated'
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        className={`${btnBase} ${page >= totalPages ? 'opacity-40 cursor-not-allowed' : ''}`}
        onClick={() => { if (page < totalPages) onPageChange(page + 1); }}
        disabled={page >= totalPages}
        aria-label="Page suivante"
      >
        <ChevronRight size={14} />
      </button>
    </nav>
  );
}
