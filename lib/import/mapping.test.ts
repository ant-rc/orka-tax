import { expect, test } from 'vitest'
import { autoMap } from './mapping'

test('maps exact, synonym, fuzzy, and unknown columns', () => {
  const result = autoMap(['Surface (mur à mur) m²', 'SHON', 'Ville', 'Colonne Inconnue XYZ'])
  const by = (c: string) => result.find((r) => r.sourceColumn === c)!

  expect(by('Ville').suggestedField).toBe('ville')
  expect(by('Ville').status).toBe('auto')
  expect(by('SHON').suggestedField).toBe('surface_m2')          // business synonym
  expect(by('Surface (mur à mur) m²').suggestedField).toBe('surface_m2') // synonym normalized
  expect(by('Colonne Inconnue XYZ').status).toBe('unmapped')
})
