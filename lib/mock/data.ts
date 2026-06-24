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
  { id: '2', name: '13000-PARNASSE', address: 'Le Palladium', city: 'Paris - 75002', status: 'en_attente' },
  { id: '3', name: 'Mar 11, 15:30', address: 'Le Palladium', city: 'Paris - 75002', status: 'en_attente' },
  { id: '4', name: 'Mar 11, 10:10', address: 'Le Palladium', city: 'Paris - 75002', status: 'en_attente' },
  { id: '5', name: 'Mar 11, 15:30', address: 'Le Palladium', city: 'Paris - 75002', status: 'en_attente' },
  { id: '6', name: 'Mar 11, 15:30', address: 'Le Palladium', city: 'Paris - 75002', status: 'en_attente' },
  { id: '7', name: 'Mar 11, 15:30', address: 'Le Palladium', city: 'Paris - 75002', status: 'en_attente' },
  { id: '8', name: 'Mar 11, 15:30', address: 'Le Palladium', city: 'Paris - 75002', status: 'en_attente' },
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
