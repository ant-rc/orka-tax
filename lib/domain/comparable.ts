/** The 11 bien fields susceptible to correction and compared against the FISC snapshot. */
export const COMPARABLE_FIELDS = [
  'surface_m2', 'nb_pieces', 'nb_wc', 'nb_baignoires', 'nb_douches',
  'nb_bidets', 'nb_eviers', 'ascenseur', 'eau_courante', 'gaz', 'electricite',
] as const;

export type ComparableField = (typeof COMPARABLE_FIELDS)[number];

export type ComparableValues = {
  surface_m2: number | null;
  nb_pieces: number | null;
  nb_wc: number | null;
  nb_baignoires: number | null;
  nb_douches: number | null;
  nb_bidets: number | null;
  nb_eviers: number | null;
  ascenseur: boolean | null;
  eau_courante: boolean | null;
  gaz: boolean | null;
  electricite: boolean | null;
};

/** Stable key over the 11 comparable fields; biens with the same signature are
 *  "identical" and can be bulk-edited together (invariants differ). `null` is
 *  encoded distinctly from 0/false. */
export function bienSignature(v: ComparableValues): string {
  return COMPARABLE_FIELDS.map((f) => {
    const raw = v[f];
    return raw === null || raw === undefined ? '∅' : String(raw);
  }).join('|');
}
