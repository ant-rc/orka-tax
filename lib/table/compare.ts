export function compareAlphaNum(a: string, b: string): number {
  return a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' });
}
