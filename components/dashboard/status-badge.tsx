import type { BienStatut } from '@/lib/mock/data';

const STATUT_CONFIG: Record<BienStatut, { label: string; className: string }> = {
  importe: { label: 'Importé', className: 'text-ui-text-muted' },
  rapprochement: { label: 'Rapprochement en cours', className: 'bg-info/10 text-info' },
  resolu: { label: 'Résolu', className: 'bg-success/10 text-success' },
  analyse: { label: 'En analyse', className: 'bg-info/10 text-info' },
  anomalie: { label: 'Anomalie détectée', className: 'bg-warning/10 text-warning' },
  reclamation: { label: 'Réclamation', className: 'bg-error/10 text-error' },
  remboursement: { label: 'Remboursement obtenu', className: 'bg-info/10 text-info' },
};

export default function StatusBadge({ statut }: { statut: BienStatut }) {
  const { label, className } = STATUT_CONFIG[statut];
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${className}`}>
      {label}
    </span>
  );
}
