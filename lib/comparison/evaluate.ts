import type { ComparableValues } from '@/lib/domain/comparable';
import type { BienStatut } from '@/lib/domain/property';
import { compareBien, type FieldAnomaly } from './compare';
import { computeVlc, type VlcInput } from '@/lib/degrevement/compute';
import { resolveTaux } from '@/lib/tax/taux';
import { DEFAULT_BAREME, type Bareme } from '@/lib/degrevement/bareme';

export interface EvaluateInput {
  fisc: ComparableValues;
  working: ComparableValues;
  ponderation_nature: number;
  categorie: string;
  coeff_entretien: number | null;
  coeff_situation_particuliere: number | null;
  coeff_situation_generale: number | null;
  depcom: string | null;
  etage: string | null;
}

export interface BienEvaluation {
  statut: BienStatut;
  anomalies: FieldAnomaly[];
  degrevement: number;
}

const round2 = (x: number) => Math.round(x * 100) / 100;

const vlcInput = (c: ComparableValues, i: EvaluateInput): VlcInput => ({
  ...c,
  ponderation_nature: i.ponderation_nature,
  categorie: i.categorie,
  coeff_entretien: i.coeff_entretien,
  coeff_situation_particuliere: i.coeff_situation_particuliere,
  coeff_situation_generale: i.coeff_situation_generale,
});

/** Compare a bien, derive its tunnel statut and signed dégrèvement (gain/loss). */
export function evaluateBien(input: EvaluateInput, bareme: Bareme = DEFAULT_BAREME): BienEvaluation {
  const anomalies = compareBien(input.fisc, input.working);
  if (anomalies.length === 0) {
    return { statut: 'resolu', anomalies: [], degrevement: 0 };
  }
  const vlcFisc = computeVlc(vlcInput(input.fisc, input), bareme);
  const vlcWorking = computeVlc(vlcInput(input.working, input), bareme);
  const degrevement = round2((vlcFisc - vlcWorking) * resolveTaux(input.depcom, input.etage));
  return { statut: 'anomalie', anomalies, degrevement };
}
