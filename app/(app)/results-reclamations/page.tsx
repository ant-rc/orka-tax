'use client';

import { useEffect, useState } from 'react';
import { useFiscalProfile } from '@/components/dashboard/fiscal-profile-context';
import { fetchReclamationRecap, type ReclamationRecap } from '@/lib/supabase/queries';
import { BIEN_TYPE_ICON } from '@/lib/domain/property';
import { useToast } from '@/components/ui/toast';

const euro = (n: number) =>
  `${n >= 0 ? '' : '-'}${Math.abs(n).toFixed(2)} €`;

export default function ResultsReclamationsPage() {
  const { activeProfile, activeProfileId } = useFiscalProfile();
  const toast = useToast();
  const [recap, setRecap] = useState<ReclamationRecap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProfileId) { setRecap(null); setLoading(false); return; }
    let active = true;
    setLoading(true);
    fetchReclamationRecap(activeProfileId)
      .then((r) => { if (active) setRecap(r); })
      .catch(() => { if (active) toast('Impossible de charger les réclamations', 'error'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeProfileId, toast]);

  const hasData = recap && (recap.byLot.length > 0 || recap.byType.length > 0);

  return (
    <div className="m-6 flex flex-col gap-6">
      <div className="bg-white rounded-lg border border-ui-border p-6">
        <h1 className="text-lg font-semibold text-ui-text-highlighted">Résultats &amp; réclamations</h1>
        <p className="text-sm text-ui-text-muted mt-1">
          {activeProfile ? `${activeProfile.label} · ${activeProfile.commune}` : '…'}
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-ui-border p-6 text-sm text-ui-text-muted">
          Chargement…
        </div>
      ) : !hasData ? (
        <div className="bg-white rounded-lg border border-ui-border p-6 text-sm text-ui-text-muted">
          Aucune réclamation générée pour ce profil. Générez-en une depuis l&apos;écran « Gestion des anomalies ».
        </div>
      ) : (
        <>
          {/* Total global */}
          <div className="bg-cyprus-900 text-white rounded-lg p-6 flex items-center justify-between">
            <span className="text-sm font-medium">Dégrèvement total réclamé</span>
            <span className="text-2xl font-semibold">{euro(recap!.total)}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Par lot */}
            <section className="bg-white rounded-lg border border-ui-border overflow-hidden">
              <h2 className="px-5 py-3 text-sm font-semibold text-ui-text-highlighted border-b border-ui-border">
                Dégrèvement par lot
              </h2>
              <ul className="divide-y divide-ui-border">
                {recap!.byLot.map((l) => (
                  <li key={l.lotId} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="text-ui-text truncate" title={l.lotName}>{l.lotName}</span>
                    <span className={l.total >= 0 ? 'text-success-txt font-medium' : 'text-error font-medium'}>
                      {euro(l.total)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Par type de bien */}
            <section className="bg-white rounded-lg border border-ui-border overflow-hidden">
              <h2 className="px-5 py-3 text-sm font-semibold text-ui-text-highlighted border-b border-ui-border">
                Dégrèvement par type de bien
              </h2>
              <ul className="divide-y divide-ui-border">
                {recap!.byType.map((t) => (
                  <li key={t.type} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="flex items-center gap-2 text-ui-text">
                      <img src={BIEN_TYPE_ICON[t.type]} alt="" className="size-6 shrink-0" />
                      {t.type} <span className="text-ui-text-muted">· {t.count}</span>
                    </span>
                    <span className={t.total >= 0 ? 'text-success-txt font-medium' : 'text-error font-medium'}>
                      {euro(t.total)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
