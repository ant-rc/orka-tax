import { Coins } from 'lucide-react';
import { MOCK_ESTIMATION } from '@/lib/mock/data';

export default function EstimationCard() {
  return (
    <div className="bg-white rounded-lg border border-ui-border p-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="size-10 rounded-md bg-ui-bg-elevated flex items-center justify-center">
          <Coins size={20} className="text-ui-text-muted" />
        </span>
        <span className="text-base font-medium text-ui-text-highlighted">Estimation taxes foncières</span>
      </div>
      <span className="bg-red-50 text-danger-text rounded-md px-2.5 py-1 text-sm font-medium">
        {MOCK_ESTIMATION}
      </span>
    </div>
  );
}
