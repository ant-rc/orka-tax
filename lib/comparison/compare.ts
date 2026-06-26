import {
  COMPARABLE_FIELDS,
  COMPARABLE_FIELD_LABELS,
  type ComparableField,
  type ComparableValues,
} from '@/lib/domain/comparable';

export interface FieldAnomaly {
  field: string;
  fiscValue: number | boolean | null;
  newValue: number | boolean | null;
}

/** Diff the working values against the FISC snapshot over the comparable fields. */
export function compareBien(fisc: ComparableValues, working: ComparableValues): FieldAnomaly[] {
  const out: FieldAnomaly[] = [];
  for (const field of COMPARABLE_FIELDS) {
    const fiscValue = fisc[field] ?? null;
    const newValue = working[field] ?? null;
    if (fiscValue !== newValue) out.push({ field, fiscValue, newValue });
  }
  return out;
}

export interface ComparisonRow {
  field: ComparableField;
  label: string;
  working: number | boolean | null;
  fisc: number | boolean | null;
  match: boolean;
}

/** Build the per-field working-vs-FISC rows for the comparison screen. */
export function buildComparisonRows(working: ComparableValues, fisc: ComparableValues): ComparisonRow[] {
  return COMPARABLE_FIELDS.map((field) => {
    const w = working[field] ?? null;
    const f = fisc[field] ?? null;
    return { field, label: COMPARABLE_FIELD_LABELS[field], working: w, fisc: f, match: w === f };
  });
}
