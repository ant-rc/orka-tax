'use client';

import { Rocket } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import ProfileSwitcher from '@/components/dashboard/profile-switcher';

export default function Header() {
  const toast = useToast();

  return (
    <header className="h-[72px] bg-white border-b border-ui-border px-8 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-medium text-black">Mon avis de taxe foncière</h1>
        <span className="bg-badge-warning-bg text-badge-warning-text rounded-md px-2 py-1 text-sm font-medium">
          Vérification gratuite jusqu&apos;à juillet 2026
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => toast('Fonctionnalité bientôt disponible')}
          className="border border-vert-900 text-vert-900 rounded-md px-3 py-2 text-sm flex items-center gap-1.5 hover:bg-vert-900/5 transition-colors"
          aria-label="Obtenir des crédits"
        >
          <Rocket size={18} />
          Obtenir des crédits
        </button>
        <ProfileSwitcher />
      </div>
    </header>
  );
}
