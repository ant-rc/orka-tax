export function coerceNumber(raw: string): number | null {
  const v = raw.trim().replace(',', '.')
  if (v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : NaN // NaN signals invalid
}

export function coerceBool(raw: string): boolean | null {
  const v = raw.trim().toLowerCase()
  if (v === '') return null
  if (['1', 'oui', 'true', 'o'].includes(v)) return true
  if (['0', 'non', 'false', 'n'].includes(v)) return false
  return null
}
