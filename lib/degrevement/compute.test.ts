import { expect, test, describe, it } from 'vitest'
import { computeDegrevement, computeVlc } from './compute'
import { DEFAULT_BAREME } from './bareme'

const bien = {
  surface_m2: 50, ponderation_nature: 1, categorie: '4',
  coeff_entretien: 1, coeff_situation_particuliere: 1, coeff_situation_generale: 1,
  eau_courante: true, gaz: false, electricite: true, ascenseur: false,
  nb_wc: 1, nb_baignoires: 0, nb_douches: 1, nb_bidets: 0, nb_eviers: 1,
  vlc_reference: 1000, taux_imposition: 0.25,
}

test('computes weighted surface, VLC and clamps relief to >= 0', () => {
  const r = computeDegrevement(bien, DEFAULT_BAREME)
  expect(r.surfacePonderee).toBeCloseTo(65)
  expect(r.vlcRecalculee).toBeCloseTo(390)
  expect(r.degrevementEstime).toBeCloseTo(152.5)
})

test('parking weighting (0.6) yields smaller weighted surface than housing', () => {
  const housing = computeDegrevement({ ...bien, ponderation_nature: 1 }, DEFAULT_BAREME)
  const parking = computeDegrevement({ ...bien, ponderation_nature: 0.6 }, DEFAULT_BAREME)
  expect(parking.surfacePonderee).toBeLessThan(housing.surfacePonderee)
})

describe('computeVlc', () => {
  const v = {
    surface_m2: 28, ponderation_nature: 1, categorie: '6',
    coeff_entretien: 1, coeff_situation_particuliere: 1, coeff_situation_generale: 1,
    nb_pieces: 3, nb_wc: 1, nb_baignoires: 0, nb_douches: 1, nb_bidets: 0, nb_eviers: 1,
    ascenseur: false, eau_courante: true, gaz: false, electricite: true,
  }

  it('drops when a sanitary equipment is removed', () => {
    const full = computeVlc(v, DEFAULT_BAREME)
    const minusShower = computeVlc({ ...v, nb_douches: 0 }, DEFAULT_BAREME)
    expect(minusShower).toBeLessThan(full)
  })

  it('is positive for a normal apartment', () => {
    expect(computeVlc(v, DEFAULT_BAREME)).toBeGreaterThan(0)
  })
})
