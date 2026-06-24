import { CANONICAL_FIELDS } from '@/lib/canonical/fields'
import type { MappingProposal } from './mapping'
import { coerceBool, coerceNumber } from './coerce'

export type BienInput = Record<string, string | number | boolean | null>

export interface RowError {
  rowIndex: number
  column: string
  code: 'required' | 'type'
  message: string
}

const byKey = new Map(CANONICAL_FIELDS.map((f) => [f.key, f]))

export function validateRows(
  rows: Record<string, unknown>[],
  mapping: MappingProposal[],
): { valid: BienInput[]; errors: RowError[] } {
  const valid: BienInput[] = []
  const errors: RowError[] = []

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    try {
      const row = rows[rowIndex]
      const rowErrors: RowError[] = []
      const built: BienInput = {}

      for (const proposal of mapping) {
        if (proposal.suggestedField === null) continue
        const field = byKey.get(proposal.suggestedField)
        if (!field) continue

        const raw = String(row[proposal.sourceColumn] ?? '')

        if (field.type === 'number' || field.type === 'int') {
          const n = coerceNumber(raw)
          if (n !== null && Number.isNaN(n)) {
            rowErrors.push({
              rowIndex,
              column: field.key,
              code: 'type',
              message: `"${raw}" n'est pas un nombre valide pour le champ "${field.key}"`,
            })
          } else {
            built[field.key] = n
          }
        } else if (field.type === 'boolean') {
          built[field.key] = coerceBool(raw)
        } else {
          built[field.key] = raw.trim() === '' ? null : raw.trim()
        }
      }

      for (const field of CANONICAL_FIELDS) {
        if (!field.required) continue
        const val = built[field.key]
        if (val === null || val === undefined || val === '') {
          rowErrors.push({
            rowIndex,
            column: field.key,
            code: 'required',
            message: `Le champ requis "${field.key}" est manquant ou vide`,
          })
        }
      }

      if (rowErrors.length === 0) {
        valid.push(built)
      } else {
        for (const e of rowErrors) errors.push(e)
      }
    } catch {
      errors.push({
        rowIndex,
        column: '__row__',
        code: 'type',
        message: `Erreur inattendue lors du traitement de la ligne ${rowIndex}`,
      })
    }
  }

  return { valid, errors }
}
