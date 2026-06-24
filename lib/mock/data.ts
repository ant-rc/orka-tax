export type LotStatus = 'en_attente';

export interface Lot {
  id: string;
  name: string;
  address: string;
  city: string;
  status: LotStatus;
}

export interface SuiviItem {
  id: string;
  date: string;
  label: string;
  hasDownload: boolean;
}

export type DeclarationIconKind = 'hash' | 'home';

export interface DeclarationRow {
  id: string;
  icon: DeclarationIconKind;
  label: string;
}

export const MOCK_LOTS: Lot[] = [
  { id: '1', name: '94077-VOLTA', address: '12 RUE BIS SAINT…', city: 'VILLENEUVE LE ROI', status: 'en_attente' },
  { id: '2', name: '75011-OBERKAMPF', address: '34 rue Oberkampf', city: 'Paris - 75011', status: 'en_attente' },
  { id: '3', name: '69003-PART-DIEU', address: '8 cours Lafayette', city: 'Lyon - 69003', status: 'en_attente' },
  { id: '4', name: '92100-BOULOGNE', address: '15 avenue Jean-Baptiste Clément', city: 'Boulogne-Billancourt - 92100', status: 'en_attente' },
  { id: '5', name: '13006-PRADO', address: '120 avenue du Prado', city: 'Marseille - 13006', status: 'en_attente' },
  { id: '6', name: '33000-CHARTRONS', address: '47 cours du Médoc', city: 'Bordeaux - 33000', status: 'en_attente' },
  { id: '7', name: '59000-VAUBAN', address: '22 boulevard Vauban', city: 'Lille - 59000', status: 'en_attente' },
  { id: '8', name: '06000-CARRÉ-DOR', address: '5 rue de la Liberté', city: 'Nice - 06000', status: 'en_attente' },
];

export const MOCK_DECLARATION_ROWS: DeclarationRow[] = [
  { id: '1', icon: 'hash', label: 'Collecte des documents' },
  { id: '2', icon: 'home', label: 'Collecte des documents' },
  { id: '3', icon: 'home', label: '150 biens' },
  { id: '4', icon: 'home', label: '150 biens' },
];

export const MOCK_SUIVI: SuiviItem[] = [
  { id: '1', date: '17/07/2026', label: 'lorem ipsum', hasDownload: false },
  { id: '2', date: '17/07/2026', label: 'lorem ipsum', hasDownload: false },
  { id: '3', date: '17/07/2026', label: 'lorem ipsum', hasDownload: false },
  { id: '4', date: '17/07/2026', label: 'lorem ipsum', hasDownload: false },
  { id: '5', date: '17/07/2026', label: 'lorem ipsum', hasDownload: true },
  { id: '6', date: '17/07/2026', label: 'lorem ipsum', hasDownload: false },
  { id: '7', date: '17/07/2026', label: 'lorem ipsum', hasDownload: false },
];

export const MOCK_ESTIMATION = '879 €';
export const MOCK_FILTERS = ['Nuxt', 'Vue', 'Vite'];
export const MOCK_COUNTS = { configured: 10, total: 150 };
export const MOCK_LAST_MODIFIED = '09/12/2026';

// --- Biens (properties inside a lot) ---

export type BienType = 'Appartement' | 'Parking';

// The qualification tunnel from the cadrage:
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
  type: BienType;
  reference: string;
  surface: string;
  etage: string;
  degrevement: LotStatus;
  statut: BienStatut;
}

export const MOCK_BIENS: Bien[] = [
  { id: '1', type: 'Appartement', reference: '940770660134', surface: '28m2', etage: '0', degrevement: 'en_attente', statut: 'importe' },
  { id: '2', type: 'Parking', reference: '940770660147', surface: '12m2', etage: '0', degrevement: 'en_attente', statut: 'rapprochement' },
  { id: '3', type: 'Appartement', reference: '940770660148', surface: '28m2', etage: '0', degrevement: 'en_attente', statut: 'resolu' },
  { id: '4', type: 'Appartement', reference: '940770660149', surface: '28m2', etage: '0', degrevement: 'en_attente', statut: 'analyse' },
  { id: '5', type: 'Appartement', reference: '940770660188', surface: '42m2', etage: '2', degrevement: 'en_attente', statut: 'anomalie' },
  { id: '6', type: 'Appartement', reference: '940770660189', surface: '42m2', etage: '2', degrevement: 'en_attente', statut: 'reclamation' },
  { id: '7', type: 'Appartement', reference: '940770660190', surface: '42m2', etage: '2', degrevement: 'en_attente', statut: 'remboursement' },
  { id: '8', type: 'Appartement', reference: '940770660191', surface: '42m2', etage: '2', degrevement: 'en_attente', statut: 'resolu' },
  { id: '9', type: 'Parking', reference: '940770660192', surface: '42m2', etage: '2', degrevement: 'en_attente', statut: 'resolu' },
];
