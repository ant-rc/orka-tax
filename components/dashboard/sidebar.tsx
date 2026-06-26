'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Folder, Target, ScrollText, CircleHelp } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function Sidebar() {
  const pathname = usePathname();
  const toast = useToast();

  // Distinct active states so a single nav icon is highlighted at a time:
  // the grid owns the dashboard overview, the folder owns a lot's biens.
  const dashboardActive = pathname.startsWith('/dashboard');
  const lotsActive = pathname.startsWith('/lot');
  const anomaliesActive = pathname.startsWith('/manage-anomalies');
  const reclamationsActive = pathname.startsWith('/results-reclamations');

  return (
    <aside className="w-16 bg-cyprus-900 flex flex-col items-center py-4 gap-2 shrink-0">
      {/* Logo */}
      <div className="py-2 mb-2">
        <span className="text-sm font-bold text-white">OR<span className="text-vert-400">K</span></span>
      </div>

      {/* Nav icons */}
      <nav className="flex flex-col items-center gap-2 flex-1">
        <Link
          href="/dashboard"
          className={`size-10 flex items-center justify-center rounded-md transition-colors ${
            dashboardActive
              ? 'bg-vert-400 text-cyprus-900'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          aria-label="Tableau de bord"
        >
          <LayoutGrid size={20} />
        </Link>
        <Link
          href="/dashboard"
          className={`size-10 flex items-center justify-center rounded-md transition-colors ${
            lotsActive
              ? 'bg-vert-400 text-cyprus-900'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          aria-label="Lots et biens"
        >
          <Folder size={20} />
        </Link>
        <Link
          href="/manage-anomalies"
          className={`size-10 flex items-center justify-center rounded-md transition-colors ${
            anomaliesActive
              ? 'bg-vert-400 text-cyprus-900'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          aria-label="Gestion des anomalies"
        >
          <Target size={20} />
        </Link>
        <Link
          href="/results-reclamations"
          className={`size-10 flex items-center justify-center rounded-md transition-colors ${
            reclamationsActive
              ? 'bg-vert-400 text-cyprus-900'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          aria-label="Résultats et réclamations"
        >
          <ScrollText size={20} />
        </Link>
      </nav>

      {/* Bottom */}
      <div className="mt-auto">
        <button
          onClick={() => toast('Section à venir')}
          className="size-10 flex items-center justify-center rounded-md text-white/40 hover:text-white/70 transition-colors"
          aria-label="Aide"
        >
          <CircleHelp size={20} />
        </button>
      </div>
    </aside>
  );
}
