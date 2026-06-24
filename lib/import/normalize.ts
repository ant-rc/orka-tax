export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/\(.*?\)/g, ' ')                          // drop "(1/0)", "(oui/non)"
    .replace(/m²|m2/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')                       // punctuation → space
    .trim().replace(/\s+/g, ' ')
}
