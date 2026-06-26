import { CANONICAL_FIELDS } from '@/lib/canonical/fields';
import { bienValueEqual, rowsToBiens } from './client';
import type { ParsedTable } from './client';

export interface DiffField {
  key: string;
  label: string;
  current: unknown;
  incoming: unknown;
}

export interface ImportDiffRow {
  bienId: string;
  reference: string;
  changedFields: DiffField[];
}

type FullBienRow = Record<string, unknown> & { id: string; invariant_cadastral: string | null };

const LABEL_BY_KEY = new Map(CANONICAL_FIELDS.map((f) => [f.key, f.label]));

// Champs comparés : tout sauf invariant_cadastral (c'est la clé d'identification, pas une donnée)
const COMPARABLE_FIELDS = CANONICAL_FIELDS.filter((f) => f.key !== 'invariant_cadastral');

/**
 * Compare chaque ligne du fichier importé au bien de même position dans la base
 * (ligne i du CSV = bien i de la base, triés par created_at).
 * Renvoie uniquement les lignes qui ont au moins un champ différent.
 */
export function diffBiensAgainstImport(
  existingBiens: FullBienRow[],
  table: ParsedTable,
): ImportDiffRow[] {
  const importedRows = rowsToBiens(table);
  const diffs: ImportDiffRow[] = [];

  const len = Math.min(existingBiens.length, importedRows.length);

  for (let i = 0; i < len; i++) {
    const existing = existingBiens[i];
    const incoming = importedRows[i];

    const changedFields: DiffField[] = [];
    for (const field of COMPARABLE_FIELDS) {
      // Ignorer les champs absents du CSV (non mappés) ou sans valeur (cellule vide)
      if (!(field.key in incoming)) continue;
      const incomingVal = incoming[field.key] ?? null;
      if (incomingVal === null) continue;
      const current = existing[field.key];
      if (!bienValueEqual(current, incomingVal as string | number | boolean | null)) {
        changedFields.push({
          key: field.key,
          label: LABEL_BY_KEY.get(field.key) ?? field.key,
          current,
          incoming: incomingVal,
        });
      }
    }

    if (changedFields.length > 0) {
      diffs.push({
        bienId: existing.id,
        reference: String(existing.invariant_cadastral ?? ''),
        changedFields,
      });
    }
  }

  return diffs;
}
