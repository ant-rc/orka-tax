import { Building2, Hash, Home } from 'lucide-react';
import { MOCK_DECLARATION_ROWS, type DeclarationRow } from '@/lib/mock/data';

function RowIcon({ kind }: { kind: DeclarationRow['icon'] }) {
  if (kind === 'hash') return <Hash size={16} className="text-ui-text-muted shrink-0" />;
  return <Home size={16} className="text-ui-text-muted shrink-0" />;
}

export default function DeclarationCard() {
  return (
    <div className="bg-white rounded-lg border border-ui-border p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="size-10 rounded-md bg-ui-bg-elevated flex items-center justify-center">
          <Building2 size={20} className="text-ui-text-muted" />
        </span>
        <h2 className="text-lg font-semibold text-ui-text-highlighted">Votre déclarations</h2>
      </div>
      <div className="border-t border-ui-border pt-4 flex flex-col gap-3">
        {MOCK_DECLARATION_ROWS.map((row) => (
          <div key={row.id} className="flex items-center gap-3 text-sm text-ui-text-muted">
            <RowIcon kind={row.icon} />
            <span>{row.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
