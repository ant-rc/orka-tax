/** Taux d'imposition de la taxe foncière par commune (clé = depcom INSEE).
 *  Valeurs réelles à affiner ; structure prête. */
export const TAUX_PAR_COMMUNE: Record<string, number> = {
  '75111': 0.2015, // Paris 11e
  '69383': 0.2934, // Lyon 3e
  '13206': 0.3438, // Marseille 6e
  '17300': 0.4521, // La Rochelle
  '64122': 0.3712, // Biarritz
  '94077': 0.4189, // Villeneuve-le-Roi
};

/** Taux par défaut pour une commune non répertoriée. */
export const DEFAULT_TAUX = 0.35;

/** Le taux est aussi modulé par l'étage : +2 % par étage au-dessus du rez. */
export function etageCoefficient(etage: string | null): number {
  const n = etage == null ? 0 : parseInt(etage, 10);
  const floor = Number.isFinite(n) ? Math.max(0, n) : 0;
  return 1 + floor * 0.02;
}

/** Taux d'imposition effectif = taux commune × coefficient étage. */
export function resolveTaux(depcom: string | null, etage: string | null): number {
  const base = (depcom && TAUX_PAR_COMMUNE[depcom]) || DEFAULT_TAUX;
  return base * etageCoefficient(etage);
}
