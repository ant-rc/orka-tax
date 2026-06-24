import { Rocket } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-[72px] bg-white border-b border-ui-border px-8 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-medium text-black">Mon avis de taxe foncière</h1>
        <span className="bg-badge-warning-bg text-badge-warning-text rounded-md px-2 py-1 text-sm font-medium">
          Vérification gratuite
        </span>
      </div>
      <button className="border border-vert-900 text-vert-900 rounded-md px-3 py-2 text-sm flex items-center gap-1.5 hover:bg-vert-900/5 transition-colors">
        <Rocket size={18} />
        Obtenir des crédits
      </button>
    </header>
  );
}
