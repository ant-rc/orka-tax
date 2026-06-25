'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchBienById } from '@/lib/supabase/queries';
import type { Bien } from '@/lib/domain/property';
import StatusBadge from '@/components/dashboard/status-badge';

export default function BienDetailPage({
  params,
}: {
  params: Promise<{ lotId: string; bienId: string }>;
}) {
  const { lotId, bienId } = use(params);
  const [bien, setBien] = useState<Bien | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchBienById(bienId)
      .then((b) => { if (active) setBien(b); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [bienId]);

  return (
    <div className="m-6">
      <div className="bg-white rounded-lg border border-ui-border p-6">
        <Link
          href={`/lot/${lotId}/vos-biens`}
          className="text-sm text-ui-text-muted hover:text-ui-text transition-colors mb-4 inline-block"
        >
          ← Retour aux biens
        </Link>

        {loading ? (
          <p className="text-sm text-ui-text-muted">Chargement…</p>
        ) : bien ? (
          <>
            <h1 className="text-xl font-semibold text-ui-text-highlighted mb-6">
              Fiche du bien (aperçu)
            </h1>
            <dl className="flex flex-col gap-3">
              <div className="flex gap-6">
                <dt className="text-sm text-ui-text-muted w-32 shrink-0">Type</dt>
                <dd className="text-sm text-ui-text-highlighted font-medium">{bien.type}</dd>
              </div>
              <div className="flex gap-6">
                <dt className="text-sm text-ui-text-muted w-32 shrink-0">Référence</dt>
                <dd className="text-sm text-ui-text">{bien.reference}</dd>
              </div>
              <div className="flex gap-6">
                <dt className="text-sm text-ui-text-muted w-32 shrink-0">Surface</dt>
                <dd className="text-sm text-ui-text">{bien.surface}</dd>
              </div>
              <div className="flex gap-6">
                <dt className="text-sm text-ui-text-muted w-32 shrink-0">Étage</dt>
                <dd className="text-sm text-ui-text">{bien.etage}</dd>
              </div>
              <div className="flex gap-6">
                <dt className="text-sm text-ui-text-muted w-32 shrink-0">Statut</dt>
                <dd><StatusBadge statut={bien.statut} /></dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="text-sm text-ui-text-muted">Bien introuvable.</p>
        )}
      </div>
    </div>
  );
}
