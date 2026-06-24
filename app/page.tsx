import Sidebar from '@/components/dashboard/sidebar';
import Header from '@/components/dashboard/header';
import Stepper from '@/components/dashboard/stepper';
import DeclarationCard from '@/components/dashboard/declaration-card';
import EstimationCard from '@/components/dashboard/estimation-card';
import SuiviCard from '@/components/dashboard/suivi-card';
import LotsPanel from '@/components/dashboard/lots-panel';
import BottomBar from '@/components/dashboard/bottom-bar';

export default function Home() {
  return (
    <div className="flex h-screen overflow-hidden bg-ui-bg-elevated">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <Stepper />
        <main className="flex-1 overflow-y-auto">
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
        </main>
        <BottomBar />
      </div>
    </div>
  );
}
