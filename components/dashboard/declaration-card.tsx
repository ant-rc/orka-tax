'use client';

import { useEffect, useState } from 'react';
import { Hash, Home, MapPin } from 'lucide-react';
import { useFiscalProfile } from '@/components/dashboard/fiscal-profile-context';
import { fetchDeclarationCounts } from '@/lib/supabase/queries';

export default function DeclarationCard() {
  const { activeProfile } = useFiscalProfile();
  const [counts, setCounts] = useState<{ lots: number; biens: number } | null>(null);

  useEffect(() => {
    if (!activeProfile) { setCounts(null); return; }
    let active = true;
    setCounts(null);
    fetchDeclarationCounts(activeProfile.id)
      .then((c) => { if (active) setCounts(c); })
      .catch(() => { if (active) setCounts({ lots: 0, biens: 0 }); });
    return () => { active = false; };
  }, [activeProfile]);

  return (
    <div className="bg-white rounded-lg border border-ui-border p-5">
      <div className="flex items-center gap-3 mb-4">
        <img src="/assets/lots.webp" alt="" className="size-10" />
        <h2 className="text-lg font-semibold text-ui-text-highlighted">Votre déclaration</h2>
      </div>
      <div className="border-t border-ui-border pt-4 flex flex-col gap-3 text-sm text-ui-text-muted">
        <div className="flex items-center gap-3">
          <Hash size={16} className="text-ui-text-muted shrink-0" />
          <span>{activeProfile ? `N° ${activeProfile.numeroFiscal}` : '…'}</span>
        </div>
        <div className="flex items-center gap-3">
          <MapPin size={16} className="text-ui-text-muted shrink-0" />
          <span className="truncate" title={activeProfile?.commune ?? undefined}>
            {activeProfile ? `${activeProfile.label} · ${activeProfile.commune}` : '…'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Home size={16} className="text-ui-text-muted shrink-0" />
          <span>{counts ? `${counts.lots} lots` : '… lots'}</span>
        </div>
        <div className="flex items-center gap-3">
          <Home size={16} className="text-ui-text-muted shrink-0" />
          <span>{counts ? `${counts.biens} biens` : '… biens'}</span>
        </div>
      </div>
    </div>
  );
}
