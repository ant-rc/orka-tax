import { CANONICAL_FIELDS } from '@/lib/canonical/fields'
import { normalize } from './normalize'
import { similarity } from './levenshtein'

export interface MappingProposal {
  sourceColumn: string
  suggestedField: string | null
  confidence: number
  status: 'auto' | 'suggest' | 'unmapped'
}

export function autoMap(headers: string[]): MappingProposal[] {
  return headers.map((sourceColumn) => {
    const src = normalize(sourceColumn)
    let best = { field: null as string | null, score: 0 }
    for (const f of CANONICAL_FIELDS) {
      const candidates = [normalize(f.label), normalize(f.key), ...f.synonyms.map(normalize)]
      for (const c of candidates) {
        const score = c === src ? 1 : similarity(src, c)
        if (score > best.score) best = { field: f.key, score }
      }
    }
    const status = best.score >= 0.8 ? 'auto' : best.score >= 0.5 ? 'suggest' : 'unmapped'
    return {
      sourceColumn,
      suggestedField: status === 'unmapped' ? null : best.field,
      confidence: Number(best.score.toFixed(2)),
      status,
    }
  })
}
