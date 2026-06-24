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

// --- Lot generator helpers ---

interface LotSeed {
  cp: string;
  slug: string;
  street: string;
  cityLabel: string;
}

const LOT_SEEDS: LotSeed[] = [
  { cp: '94077', slug: 'VOLTA',       street: '12 RUE BIS SAINT',       cityLabel: 'VILLENEUVE LE ROI' },
  { cp: '75011', slug: 'OBERKAMPF',   street: '34 rue Oberkampf',        cityLabel: 'Paris - 75011' },
  { cp: '69003', slug: 'PART-DIEU',   street: '8 cours Lafayette',       cityLabel: 'Lyon - 69003' },
  { cp: '92100', slug: 'BOULOGNE',    street: '15 av Jean-Baptiste Clément', cityLabel: 'Boulogne-Billancourt - 92100' },
  { cp: '13006', slug: 'PRADO',       street: '120 avenue du Prado',     cityLabel: 'Marseille - 13006' },
  { cp: '33000', slug: 'CHARTRONS',   street: '47 cours du Médoc',       cityLabel: 'Bordeaux - 33000' },
  { cp: '59000', slug: 'VAUBAN',      street: '22 boulevard Vauban',     cityLabel: 'Lille - 59000' },
  { cp: '06000', slug: 'CARRÉ-DOR',   street: '5 rue de la Liberté',     cityLabel: 'Nice - 06000' },
  { cp: '31000', slug: 'CAPITOLE',    street: '10 place du Capitole',    cityLabel: 'Toulouse - 31000' },
  { cp: '67000', slug: 'ORANGERIE',   street: '3 rue de l\'Orangerie',   cityLabel: 'Strasbourg - 67000' },
  { cp: '44000', slug: 'GRASLIN',     street: '18 place Graslin',        cityLabel: 'Nantes - 44000' },
  { cp: '34000', slug: 'ECUSSON',     street: '6 rue de l\'Ecusson',     cityLabel: 'Montpellier - 34000' },
  { cp: '06300', slug: 'CIMIEZ',      street: '25 avenue de Cimiez',     cityLabel: 'Nice - 06300' },
  { cp: '75015', slug: 'BEAUGRENELLE', street: '3 rue Beaugrenelle',     cityLabel: 'Paris - 75015' },
  { cp: '75008', slug: 'MONCEAU',     street: '9 rue de Monceau',        cityLabel: 'Paris - 75008' },
  { cp: '78000', slug: 'VERSAILLES',  street: '14 avenue de Paris',      cityLabel: 'Versailles - 78000' },
  { cp: '38000', slug: 'BASTILLE',    street: '2 place de la Bastille',  cityLabel: 'Grenoble - 38000' },
  { cp: '76000', slug: 'VIEUX-PORT',  street: '11 quai du Havre',        cityLabel: 'Rouen - 76000' },
  { cp: '57000', slug: 'PONTIFFROY',  street: '4 rue Pontiffroy',        cityLabel: 'Metz - 57000' },
  { cp: '54000', slug: 'STANISLAS',   street: '1 place Stanislas',       cityLabel: 'Nancy - 54000' },
  { cp: '29200', slug: 'RECOUVRANCE', street: '7 rue de Recouvrance',    cityLabel: 'Brest - 29200' },
  { cp: '42000', slug: 'BELLEVUE',    street: '32 avenue Bellevue',      cityLabel: 'Saint-Étienne - 42000' },
  { cp: '64000', slug: 'GRAND-BAYONNE', street: '19 rue du Port-Neuf',  cityLabel: 'Bayonne - 64000' },
  { cp: '13001', slug: 'PANIER',      street: '8 place des Moulins',     cityLabel: 'Marseille - 13001' },
  { cp: '69006', slug: 'BROTTEAUX',   street: '45 boulevard des Brotteaux', cityLabel: 'Lyon - 69006' },
  { cp: '75019', slug: 'VILLETTE',    street: '30 avenue de la Villette', cityLabel: 'Paris - 75019' },
  { cp: '93100', slug: 'SAINT-DENIS', street: '5 rue de la République',  cityLabel: 'Saint-Denis - 93100' },
  { cp: '92130', slug: 'ISSY',        street: '22 rue du Gouverneur',    cityLabel: 'Issy-les-Moulineaux - 92130' },
  { cp: '69007', slug: 'GERLAND',     street: '11 allée Pierre de Coubertin', cityLabel: 'Lyon - 69007' },
  { cp: '75020', slug: 'BELLEVILLE',  street: '15 rue Ramponeau',        cityLabel: 'Paris - 75020' },
  { cp: '33300', slug: 'CAUDERAN',    street: '6 avenue de Cauderan',    cityLabel: 'Bordeaux - 33300' },
  { cp: '06200', slug: 'NICE-NORD',   street: '38 boulevard Gambetta',   cityLabel: 'Nice - 06200' },
  { cp: '31500', slug: 'RANGUEIL',    street: '12 chemin du Rangueil',   cityLabel: 'Toulouse - 31500' },
  { cp: '44300', slug: 'CHANTENAY',   street: '4 rue du Bel-Air',        cityLabel: 'Nantes - 44300' },
  { cp: '75003', slug: 'MARAIS',      street: '7 rue des Francs-Bourgeois', cityLabel: 'Paris - 75003' },
  { cp: '59800', slug: 'LILLE-FIVES', street: '16 rue de Fives',         cityLabel: 'Lille - 59800' },
  { cp: '67100', slug: 'NEUDORF',     street: '9 rue du Huhnerzug',      cityLabel: 'Strasbourg - 67100' },
  { cp: '13008', slug: 'PERIER',      street: '56 rue Émile-Zola',       cityLabel: 'Marseille - 13008' },
  { cp: '92200', slug: 'NEUILLY',     street: '3 avenue du Roule',       cityLabel: 'Neuilly-sur-Seine - 92200' },
  { cp: '75016', slug: 'PASSY',       street: '27 rue de Passy',         cityLabel: 'Paris - 75016' },
  { cp: '69009', slug: 'VAISE',       street: '5 place Valmy',           cityLabel: 'Lyon - 69009' },
  { cp: '34090', slug: 'AIGUELONGUE', street: '18 rue d\'Aiguelongue',   cityLabel: 'Montpellier - 34090' },
  { cp: '76100', slug: 'LE-HAVRE',    street: '20 cours de la République', cityLabel: 'Le Havre - 76100' },
  { cp: '38130', slug: 'ECHIROLLES',  street: '8 avenue des États-Unis', cityLabel: 'Échirolles - 38130' },
  { cp: '06500', slug: 'MENTON',      street: '14 avenue de la Madone',  cityLabel: 'Menton - 06500' },
];

function generateLots(): Lot[] {
  return LOT_SEEDS.map((seed, idx) => ({
    id: String(idx + 1),
    name: `${seed.cp}-${seed.slug}`,
    address: seed.street,
    city: seed.cityLabel,
    status: 'en_attente' as LotStatus,
  }));
}

export const MOCK_LOTS: Lot[] = generateLots();

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
export const MOCK_LAST_MODIFIED = '09/12/2026';

// --- Biens (properties inside a lot) ---

export type BienType = 'Appartement' | 'Parking' | 'Cave';

export const BIEN_TYPES: BienType[] = ['Appartement', 'Cave', 'Parking'];

export const BIEN_TYPE_ICON: Record<BienType, string> = {
  Appartement: '/assets/meuble.webp',
  Parking: '/assets/parking.webp',
  Cave: '/assets/cave.webp',
};

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

// --- Bien generator ---

const BIEN_TYPES_CYCLE: BienType[] = ['Appartement', 'Appartement', 'Parking', 'Appartement', 'Cave'];
const BIEN_STATUTS: BienStatut[] = [
  'importe',
  'rapprochement',
  'resolu',
  'analyse',
  'anomalie',
  'reclamation',
  'remboursement',
];
const BIEN_SURFACES: string[] = ['18m2', '22m2', '28m2', '35m2', '42m2', '55m2', '63m2', '75m2', '90m2', '6m2', '10m2', '12m2'];
const BIEN_ETAGES: string[] = ['0', '0', '1', '2', '3', '4', '5', '-1', '0', '2', '3', '6'];

function generateBiens(): Bien[] {
  const base: Bien[] = [
    { id: '1',  type: 'Appartement', reference: '940770660134', surface: '28m2', etage: '0',  degrevement: 'en_attente', statut: 'importe' },
    { id: '2',  type: 'Parking',     reference: '940770660147', surface: '12m2', etage: '0',  degrevement: 'en_attente', statut: 'rapprochement' },
    { id: '3',  type: 'Appartement', reference: '940770660148', surface: '28m2', etage: '0',  degrevement: 'en_attente', statut: 'resolu' },
    { id: '4',  type: 'Appartement', reference: '940770660149', surface: '28m2', etage: '0',  degrevement: 'en_attente', statut: 'analyse' },
    { id: '5',  type: 'Appartement', reference: '940770660188', surface: '42m2', etage: '2',  degrevement: 'en_attente', statut: 'anomalie' },
    { id: '6',  type: 'Appartement', reference: '940770660189', surface: '42m2', etage: '2',  degrevement: 'en_attente', statut: 'reclamation' },
    { id: '7',  type: 'Appartement', reference: '940770660190', surface: '42m2', etage: '2',  degrevement: 'en_attente', statut: 'remboursement' },
    { id: '8',  type: 'Appartement', reference: '940770660191', surface: '42m2', etage: '2',  degrevement: 'en_attente', statut: 'resolu' },
    { id: '9',  type: 'Parking',     reference: '940770660192', surface: '42m2', etage: '2',  degrevement: 'en_attente', statut: 'resolu' },
    { id: '10', type: 'Cave',        reference: '940770660210', surface: '6m2',  etage: '-1', degrevement: 'en_attente', statut: 'importe' },
  ];

  const extra: Bien[] = [];
  for (let i = 11; i <= 45; i++) {
    const idx = i - 11;
    const type: BienType = BIEN_TYPES_CYCLE[idx % BIEN_TYPES_CYCLE.length];
    const statut: BienStatut = BIEN_STATUTS[idx % BIEN_STATUTS.length];
    const surface: string = BIEN_SURFACES[idx % BIEN_SURFACES.length];
    const etage: string = BIEN_ETAGES[idx % BIEN_ETAGES.length];
    const refNum = 940770660210 + i * 3;
    extra.push({
      id: String(i),
      type,
      reference: String(refNum),
      surface,
      etage,
      degrevement: 'en_attente',
      statut,
    });
  }

  return [...base, ...extra];
}

export const MOCK_BIENS: Bien[] = generateBiens();
