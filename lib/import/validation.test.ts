import { expect, test } from 'vitest'
import { validateRows } from './validation'
import type { MappingProposal } from './mapping'

const mapping: MappingProposal[] = [
  { sourceColumn: 'Inv', suggestedField: 'invariant_cadastral', confidence: 1, status: 'auto' },
  { sourceColumn: 'Rue', suggestedField: 'rue', confidence: 1, status: 'auto' },
  { sourceColumn: 'Ville', suggestedField: 'ville', confidence: 1, status: 'auto' },
  { sourceColumn: 'Nat', suggestedField: 'nature', confidence: 1, status: 'auto' },
  { sourceColumn: 'Cat', suggestedField: 'categorie', confidence: 1, status: 'auto' },
  { sourceColumn: 'Surf', suggestedField: 'surface_m2', confidence: 1, status: 'auto' },
  { sourceColumn: 'Eau', suggestedField: 'eau_courante', confidence: 1, status: 'auto' },
]
const base = { Inv: 'A1', Rue: 'X', Ville: 'Paris', Nat: 'appartement', Cat: '4', Surf: '45,5', Eau: 'Oui' }

test('coerces FR decimal and Oui/Non; flags missing required and bad type', () => {
  const { valid, errors } = validateRows(
    [base, { ...base, Surf: 'abc' }, { ...base, Ville: '' }],
    mapping,
  )
  expect(valid[0].surface_m2).toBe(45.5)
  expect(valid[0].eau_courante).toBe(true)
  expect(errors).toContainEqual(expect.objectContaining({ rowIndex: 1, column: 'surface_m2', code: 'type' }))
  expect(errors).toContainEqual(expect.objectContaining({ rowIndex: 2, column: 'ville', code: 'required' }))
})
