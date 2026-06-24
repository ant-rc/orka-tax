import { MOCK_ESTIMATION } from '@/lib/mock/data';

export default function EstimationCard() {
  return (
    <div className="bg-white rounded-lg border border-ui-border p-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src="/assets/argent.webp" alt="" className="size-10" />
        <span className="text-base font-medium text-ui-text-highlighted">Estimation taxes foncières</span>
      </div>
      <span className="bg-red-50 text-danger-text rounded-md px-2.5 py-1 text-sm font-medium">
        {MOCK_ESTIMATION}
      </span>
    </div>
  );
}
