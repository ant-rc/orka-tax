import type { Bareme } from './bareme'

export interface BienForEstimation {
  surface_m2: number
  ponderation_nature: number
  categorie: string
  coeff_entretien: number | null
  coeff_situation_particuliere: number | null
  coeff_situation_generale: number | null
  eau_courante: boolean | null
  gaz: boolean | null
  electricite: boolean | null
  ascenseur: boolean | null
  nb_wc: number | null
  nb_baignoires: number | null
  nb_douches: number | null
  nb_bidets: number | null
  nb_eviers: number | null
  vlc_reference: number | null
  taux_imposition: number | null
}

export interface EstimationResult {
  surfacePonderee: number
  vlcRecalculee: number
  degrevementEstime: number
  params: Record<string, number>
}

const n = (v: number | null, d = 0): number => (v == null ? d : v)

export function computeDegrevement(bien: BienForEstimation, bareme: Bareme): EstimationResult {
  const e = bareme.equivalencesEquipements
  const sanitaires = n(bien.nb_wc) + n(bien.nb_baignoires) + n(bien.nb_douches) + n(bien.nb_bidets) + n(bien.nb_eviers)
  const equivalences =
    (bien.eau_courante ? e.eau : 0) + (bien.gaz ? e.gaz : 0) +
    (bien.electricite ? e.electricite : 0) + (bien.ascenseur ? e.ascenseur : 0) +
    sanitaires * e.parSanitaire

  const surfacePonderee = bien.surface_m2 * bien.ponderation_nature + equivalences
  const tarif = bareme.tarifParCategorie[bien.categorie] ?? 0
  const coeffs = n(bien.coeff_entretien, 1) * n(bien.coeff_situation_particuliere, 1) * n(bien.coeff_situation_generale, 1)
  const vlcRecalculee = surfacePonderee * tarif * coeffs

  const ecart = n(bien.vlc_reference) - vlcRecalculee
  const degrevementEstime = Math.max(0, ecart * n(bien.taux_imposition))

  return {
    surfacePonderee,
    vlcRecalculee,
    degrevementEstime,
    params: { tarif, equivalences, coeffs },
  }
}
