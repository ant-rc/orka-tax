import Link from 'next/link';
import { FolderOpen, ScrollText, Gavel, ChevronRight } from 'lucide-react';

export default function Stepper() {
  return (
    <div className="bg-cyprus-950 w-full px-8 h-14 flex items-center gap-3 shrink-0">
      {/* Step 1 — active */}
      <div className="flex items-center gap-2">
        <span className="size-7 rounded-full bg-vert-400 text-cyprus-900 flex items-center justify-center shrink-0">
          <FolderOpen size={14} />
        </span>
        <span className="text-sm text-white font-medium">Collecte des documents</span>
      </div>

      <ChevronRight size={16} className="text-white/40 shrink-0" />

      {/* Step 2 — inactive, navigable */}
      <Link href="/results-reclamations" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <span className="size-7 rounded-full bg-white/10 text-white/60 flex items-center justify-center shrink-0">
          <ScrollText size={14} />
        </span>
        <span className="text-sm text-white/60">Résultats et réclamations</span>
      </Link>

      <ChevronRight size={16} className="text-white/40 shrink-0" />

      {/* Step 3 — inactive */}
      <div className="flex items-center gap-2">
        <span className="size-7 rounded-full bg-white/10 text-white/60 flex items-center justify-center shrink-0">
          <Gavel size={14} />
        </span>
        <span className="text-sm text-white/60">Décision</span>
      </div>
    </div>
  );
}
