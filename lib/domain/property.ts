// Domain model for the property portfolio (lots & biens).
// Pure types and presentation constants — data lives in Supabase.

export type LotStatus = 'en_attente';

export interface Lot {
  id: string;
  name: string;
  address: string;
  city: string;
  status: LotStatus;
}

export type BienType = 'Appartement' | 'Parking' | 'Cave';

export const BIEN_TYPES: BienType[] = ['Appartement', 'Cave', 'Parking'];

export const BIEN_TYPE_ICON: Record<BienType, string> = {
  Appartement: '/assets/meuble.webp',
  Parking: '/assets/parking.webp',
  Cave: '/assets/cave.webp',
};

// Qualification tunnel:
// importé → rapprochement en cours → résolu → en analyse →
// anomalie détectée → réclamation → remboursement obtenu
export type BienStatut =
  | 'importe'
  | 'rapprochement'
  | 'resolu'
  | 'analyse'
  | 'anomalie'
  | 'reclamation'
  | 'remboursement';

export interface Bien {
  id: string;
  lotId: string;
  type: BienType;
  reference: string;
  surface: string;
  etage: string;
  degrevement: LotStatus;
  statut: BienStatut;
}

export interface FiscalProfile {
  id: string;
  numeroFiscal: string;
  label: string;
  depcom: string;
  commune: string;
}
