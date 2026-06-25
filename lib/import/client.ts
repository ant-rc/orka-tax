import { parse as parseCsv } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { CANONICAL_FIELDS } from '@/lib/canonical/fields';
import { autoMap } from './mapping';
import { coerceBool, coerceNumber } from './coerce';

export interface ParsedTable {
  headers: string[];
  rows: Record<string, string>[];
}

/** Parse le texte d'un fichier CSV en lignes objet (première ligne = en-têtes). */
export function parseCsvText(text: string): ParsedTable {
  const rows = parseCsv(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as Record<string, string>[];
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

/** Parse le contenu binaire d'un classeur XLSX (première feuille).
 *  On lit les valeurs BRUTES (`raw: true`) puis on les convertit nous-mêmes en
 *  chaînes : le texte formaté d'Excel (`raw: false`) corrompt les grands nombres
 *  (un invariant comme 690020004523 devient "6.9002E+11"). Les en-têtes sont
 *  rognés (certains ont des espaces de fin). */
export function parseXlsxBuffer(buffer: ArrayBuffer): ParsedTable {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { headers: [], rows: [] };
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: true,
  });
  const rows = raw.map((r) => {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(r)) {
      out[key.trim()] = value == null ? '' : String(value);
    }
    return out;
  });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

/** Détecte CSV vs XLSX d'après le nom/type du fichier et le parse en lignes objet. */
export async function parseImportFile(file: File): Promise<ParsedTable> {
  const isXlsx =
    /\.xlsx$/i.test(file.name) ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (isXlsx) {
    return parseXlsxBuffer(await file.arrayBuffer());
  }
  return parseCsvText(await file.text());
}

export interface ImportedLot {
  /** Nom du lot : "depcom-nom_immeuble" issu du CSV. */
  name: string;
  depcom: string;
  nomImmeuble: string;
  rue: string;
  ville: string;
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Construit un lot à partir d'une table déjà parsée (CSV ou XLSX).
 * Le nom est dérivé des colonnes "code commune" (depcom) et "nom de l'immeuble"
 * détectées automatiquement via le mapping canonique.
 * Lève une erreur si la table est vide ou si aucune des deux colonnes n'est trouvée.
 */
export function buildImportedLot({ headers, rows }: ParsedTable): ImportedLot {
  if (rows.length === 0) {
    throw new Error('Le fichier importé est vide.');
  }

  const mapping = autoMap(headers);
  const columnFor = (field: string) =>
    mapping.find((m) => m.suggestedField === field)?.sourceColumn ?? null;

  const first = rows[0];
  const valueFor = (field: string) => {
    const col = columnFor(field);
    return col ? (first[col] ?? '').trim() : '';
  };

  const depcom = valueFor('depcom');
  const nomImmeuble = valueFor('nom_immeuble');

  if (!depcom && !nomImmeuble) {
    throw new Error(
      "Impossible de détecter les colonnes « code commune » et « nom de l'immeuble » dans le fichier.",
    );
  }

  const name = [depcom, nomImmeuble].filter(Boolean).join('-').toUpperCase();

  return {
    name,
    depcom,
    nomImmeuble,
    rue: valueFor('rue'),
    ville: valueFor('ville'),
    headers,
    rows,
  };
}

/**
 * Clé de rapprochement robuste pour un invariant cadastral.
 * Deux invariants « visuellement identiques » mais formatés différemment (notation
 * scientifique d'Excel, « .0 » décimal, espaces) doivent matcher. On NE retire PAS
 * les zéros initiaux : ils sont significatifs et les supprimer créerait de faux
 * rapprochements. Renvoie '' si l'invariant est vide.
 */
export function normalizeInvariant(raw: unknown): string {
  if (raw == null) return '';
  let s = String(raw).trim();
  // Notation scientifique Excel ("6.9002E+11") -> entier.
  if (/^-?\d+(?:\.\d+)?e[+-]?\d+$/i.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) s = BigInt(Math.round(n)).toString();
  }
  // "940770660134.0" -> "940770660134".
  s = s.replace(/\.0+$/, '');
  // Espaces internes éventuels.
  return s.replace(/\s+/g, '');
}

/**
 * Compare une valeur existante en base à une valeur issue du CSV pour décider si
 * le champ a réellement changé. Tolérant aux types (number/bool/string) : "28" et
 * 28, "true" et true sont considérés égaux.
 */
export function bienValueEqual(
  current: unknown,
  incoming: string | number | boolean | null,
): boolean {
  if (current == null || current === '') return incoming == null || incoming === '';
  if (incoming == null || incoming === '') return false;
  if (typeof current === 'number' || typeof incoming === 'number') {
    return Number(current) === Number(incoming);
  }
  if (typeof current === 'boolean' || typeof incoming === 'boolean') {
    return Boolean(current) === Boolean(incoming);
  }
  return String(current).trim() === String(incoming).trim();
}

/** Valeur d'un bien, typée selon le champ canonique (colonnes de la table `biens`). */
export type BienRecord = Record<string, string | number | boolean | null>;

const FIELD_BY_KEY = new Map(CANONICAL_FIELDS.map((f) => [f.key, f]));

/**
 * Convertit chaque ligne d'une table importée en enregistrement `biens` :
 * les colonnes sources sont rapprochées des champs canoniques via `autoMap`,
 * puis coercées selon leur type. Tolérant : aucune ligne n'est rejetée
 * (les champs manquants restent `null`).
 */
export function rowsToBiens({ headers, rows }: ParsedTable): BienRecord[] {
  const mapped = autoMap(headers).filter((m) => m.suggestedField);
  return rows.map((row) => {
    const rec: BienRecord = {};
    for (const m of mapped) {
      const field = FIELD_BY_KEY.get(m.suggestedField!);
      if (!field) continue;
      const raw = String(row[m.sourceColumn] ?? '');
      if (field.type === 'number' || field.type === 'int') {
        // Tolérant aux unités/séparateurs ("50m2", "45 m²", "1 234,5") : on isole
        // la partie numérique avant de coercer.
        const match = raw.replace(',', '.').match(/-?\d+(?:\.\d+)?/);
        const n = match ? coerceNumber(match[0]) : null;
        rec[field.key] = n !== null && Number.isNaN(n) ? null : n;
      } else if (field.type === 'boolean') {
        rec[field.key] = coerceBool(raw);
      } else {
        rec[field.key] = raw.trim() === '' ? null : raw.trim();
      }
    }
    return rec;
  });
}
