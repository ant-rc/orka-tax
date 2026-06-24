'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Folder, Target, CircleHelp } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function Sidebar() {
  const pathname = usePathname();
  const toast = useToast();

  const folderActive = pathname === '/' || pathname.startsWith('/lots');

  return (
    <aside className="w-16 bg-cyprus-900 flex flex-col items-center py-4 gap-2 shrink-0">
      {/* Logo */}
      <div className="py-2 mb-2">
        <span className="text-sm font-bold text-white">OR<span className="text-vert-400">K</span></span>
      </div>

      {/* Nav icons */}
      <nav className="flex flex-col items-center gap-2 flex-1">
        <button
          onClick={() => toast('Section à venir')}
          className="size-10 flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Tableau de bord"
        >
          <LayoutGrid size={20} />
        </button>
        {/* Active item */}
        <Link
          href="/"
          className={`size-10 flex items-center justify-center rounded-md transition-colors ${
            folderActive
              ? 'bg-vert-400 text-cyprus-900'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          aria-label="Lots et biens"
        >
          <Folder size={20} />
        </Link>
        <button
          onClick={() => toast('Section à venir')}
          className="size-10 flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Objectifs"
        >
          <Target size={20} />
        </button>
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
