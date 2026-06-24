import DeclarationCard from '@/components/dashboard/declaration-card';
import EstimationCard from '@/components/dashboard/estimation-card';
import SuiviCard from '@/components/dashboard/suivi-card';
import LotsPanel from '@/components/dashboard/lots-panel';

export default function DashboardPage() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6">
      {/* Left column */}
      <div className="w-full lg:w-[360px] shrink-0 flex flex-col gap-6">
        <DeclarationCard />
        <EstimationCard />
        <SuiviCard />
      </div>
      {/* Right column */}
      <div className="flex-1 min-w-0">
        <LotsPanel />
      </div>
    </div>
  );
}
