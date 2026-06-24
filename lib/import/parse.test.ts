import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { parseFile } from './parse'

test('parses CSV headers and rows', () => {
  const buf = readFileSync(join(__dirname, 'fixtures/sample.csv'))
  const { headers, rows } = parseFile(buf, 'csv')
  expect(headers).toEqual(['Invariant', 'Ville', 'Surface (mur à mur) m²', 'Eau courante (1/0)'])
  expect(rows).toHaveLength(2)
  expect(rows[0]['Invariant']).toBe('A123')
  expect(rows[1]['Surface (mur à mur) m²']).toBe('')
})
