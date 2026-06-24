import Link from 'next/link';
import { MOCK_BIENS } from '@/lib/mock/data';
import StatusBadge from '@/components/dashboard/status-badge';

export default async function BienDetailPage({
  params,
}: {
  params: Promise<{ lotId: string; bienId: string }>;
}) {
  const { lotId, bienId } = await params;
  const bien = MOCK_BIENS.find((b) => b.id === bienId);

  return (
    <div className="m-6">
      <div className="bg-white rounded-lg border border-ui-border p-6">
        <Link
          href={`/lot/${lotId}/vos-biens`}
          className="text-sm text-ui-text-muted hover:text-ui-text transition-colors mb-4 inline-block"
        >
          ← Retour aux biens
        </Link>

        {bien ? (
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
