'use client';

import { useFiscalProfile } from '@/components/dashboard/fiscal-profile-context';

export default function ResultsReclamationsPage() {
  const { activeProfile } = useFiscalProfile();

  return (
    <div className="bg-white rounded-lg border border-ui-border p-6 m-6">
      <div className="flex items-center gap-3 mb-3">
        <h1 className="text-lg font-semibold text-ui-text-highlighted">
          Résultats &amp; réclamations
        </h1>
        <span className="border border-ui-border rounded-full px-2.5 py-0.5 text-xs text-ui-text-muted">
          À venir
        </span>
      </div>
      <p className="text-sm text-ui-text-muted mb-2">
        {activeProfile
          ? `${activeProfile.label} · ${activeProfile.commune}`
          : '…'}
      </p>
      <p className="text-sm text-ui-text-muted">
        Suivi des résultats d&apos;analyse et des réclamations portées — écran à venir.
      </p>
    </div>
  );
}
