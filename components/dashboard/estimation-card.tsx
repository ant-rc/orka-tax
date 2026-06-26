'use client';

import { useEffect, useState } from 'react';
import { useFiscalProfile } from '@/components/dashboard/fiscal-profile-context';
import { fetchProfileDegrevement } from '@/lib/supabase/queries';

export default function EstimationCard() {
  const { activeProfileId } = useFiscalProfile();
  const [degrevement, setDegrevement] = useState<number | null>(null);

  useEffect(() => {
    if (!activeProfileId) { setDegrevement(null); return; }
    let active = true;
    fetchProfileDegrevement(activeProfileId)
      .then((v) => { if (active) setDegrevement(v); })
      .catch(() => { if (active) setDegrevement(null); });
    return () => { active = false; };
  }, [activeProfileId]);

  const positive = (degrevement ?? 0) >= 0;
  const label = degrevement === null
    ? '—'
    : `${positive ? '' : '-'}${Math.abs(degrevement).toFixed(2)} €`;

  return (
    <div className="bg-white rounded-lg border border-ui-border p-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src="/assets/argent.webp" alt="" className="size-10" />
        <span className="text-base font-medium text-ui-text-highlighted">Dégrèvement final estimé</span>
      </div>
      <span
        className={`rounded-md px-2.5 py-1 text-sm font-medium ${
          positive ? 'bg-success/10 text-success-txt' : 'bg-red-50 text-danger-text'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
