import type { BienStatut } from '@/lib/domain/property';

export const TUNNEL_ORDER: BienStatut[] = [
  'importe',
  'rapprochement',
  'resolu',
  'analyse',
  'anomalie',
  'reclamation',
  'remboursement',
];

export function simulateStatut(hasAnomaly: boolean): BienStatut {
  return hasAnomaly ? 'anomalie' : 'resolu';
}

export function nextStatut(s: BienStatut): BienStatut {
  const idx = TUNNEL_ORDER.indexOf(s);
  if (idx === -1 || idx === TUNNEL_ORDER.length - 1) return TUNNEL_ORDER[TUNNEL_ORDER.length - 1];
  return TUNNEL_ORDER[idx + 1];
}
