export type FieldType = 'string' | 'number' | 'int' | 'boolean'

export interface CanonicalField {
  key: string
  label: string        // French UI label, anti-jargon
  type: FieldType
  required: boolean
  synonyms: string[]   // business synonyms, normalized matching happens in mapping.ts
}

export const CANONICAL_FIELDS: CanonicalField[] = [
  { key: 'invariant_cadastral', label: 'Invariant cadastral', type: 'string', required: true, synonyms: ['invariant', 'code immeuble', 'ref lot', 'reference lot'] },
  { key: 'rue', label: 'Rue', type: 'string', required: true, synonyms: ['adresse', 'voie'] },
  { key: 'depcom', label: 'Code commune', type: 'string', required: false, synonyms: ['depcom', 'code insee'] },
  { key: 'ville', label: 'Ville', type: 'string', required: true, synonyms: ['commune'] },
  { key: 'nom_immeuble', label: "Nom de l'immeuble", type: 'string', required: false, synonyms: ['immeuble', 'batiment'] },
  { key: 'nature', label: 'Nature du bien', type: 'string', required: true, synonyms: ['nature', 'type de bien'] },
  { key: 'ponderation_nature', label: 'Pondération nature', type: 'number', required: false, synonyms: ['ponderation', 'ponderation en fonction de la nature'] },
  { key: 'etage', label: 'Étage', type: 'string', required: false, synonyms: ['niveau'] },
  { key: 'categorie', label: 'Catégorie', type: 'string', required: true, synonyms: ['cat'] },
  { key: 'surface_m2', label: 'Surface habitable (m²)', type: 'number', required: true, synonyms: ['surface', 'shon', 'surface mur a mur', 'm2', 'superficie'] },
  { key: 'coeff_entretien', label: "Coefficient d'entretien", type: 'number', required: false, synonyms: ['coefficient entretien'] },
  { key: 'coeff_situation_particuliere', label: 'Coefficient situation particulière', type: 'number', required: false, synonyms: ['situation particuliere'] },
  { key: 'coeff_situation_generale', label: 'Coefficient situation générale', type: 'number', required: false, synonyms: ['situation generale'] },
  { key: 'ascenseur', label: 'Ascenseur', type: 'boolean', required: false, synonyms: ['ascenseur oui non'] },
  { key: 'eau_courante', label: 'Eau courante', type: 'boolean', required: false, synonyms: ['eau'] },
  { key: 'gaz', label: 'Raccordement gaz', type: 'boolean', required: false, synonyms: ['gaz', 'raccordement au gaz'] },
  { key: 'electricite', label: 'Raccordement électricité', type: 'boolean', required: false, synonyms: ['electricite', 'raccordement a l electricite'] },
  { key: 'nb_baignoires', label: 'Nombre de baignoires', type: 'int', required: false, synonyms: ['baignoires'] },
  { key: 'nb_douches', label: 'Nombre de douches', type: 'int', required: false, synonyms: ['receveurs de douche', 'douches'] },
  { key: 'nb_bidets', label: 'Nombre de bidets', type: 'int', required: false, synonyms: ['bidets'] },
  { key: 'nb_wc', label: 'Nombre de WC', type: 'int', required: false, synonyms: ['wc'] },
  { key: 'nb_eviers', label: "Nombre d'éviers", type: 'int', required: false, synonyms: ['eviers'] },
  { key: 'egout', label: 'Raccordement égout', type: 'boolean', required: false, synonyms: ['egout', 'raccordement a l egout'] },
  { key: 'nb_pieces', label: 'Nombre de pièces', type: 'int', required: false, synonyms: ['pieces'] },
  { key: 'nb_vide_ordures', label: 'Nombre de vide-ordures', type: 'int', required: false, synonyms: ['vide ordures'] },
]
