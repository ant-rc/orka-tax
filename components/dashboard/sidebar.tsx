import { LayoutGrid, Folder, Target, CircleHelp } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-16 bg-cyprus-900 flex flex-col items-center py-4 gap-2 shrink-0">
      {/* Logo */}
      <div className="py-2 mb-2">
        <span className="text-sm font-bold text-white">OR<span className="text-vert-400">K</span></span>
      </div>

      {/* Nav icons */}
      <nav className="flex flex-col items-center gap-2 flex-1">
        <button className="size-10 flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <LayoutGrid size={20} />
        </button>
        {/* Active item */}
        <button className="size-10 flex items-center justify-center rounded-md bg-vert-400 text-cyprus-900">
          <Folder size={20} />
        </button>
        <button className="size-10 flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors">
          <Target size={20} />
        </button>
      </nav>

      {/* Bottom */}
      <div className="mt-auto">
        <button className="size-10 flex items-center justify-center rounded-md text-white/40 hover:text-white/70 transition-colors">
          <CircleHelp size={20} />
        </button>
      </div>
    </aside>
  );
}
