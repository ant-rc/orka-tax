import Sidebar from '@/components/dashboard/sidebar';
import Header from '@/components/dashboard/header';
import Stepper from '@/components/dashboard/stepper';
import BottomBar from '@/components/dashboard/bottom-bar';
import { SelectionProvider } from '@/components/dashboard/selection-context';
import { FiscalProfileProvider } from '@/components/dashboard/fiscal-profile-context';

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <SelectionProvider>
      <FiscalProfileProvider>
        <div className="flex h-screen overflow-hidden bg-ui-bg-elevated">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <Header />
            <Stepper />
            <main className="flex-1 overflow-y-auto">{children}</main>
            <BottomBar />
          </div>
        </div>
      </FiscalProfileProvider>
    </SelectionProvider>
  );
}
