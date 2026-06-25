import { COMPARABLE_FIELDS, type ComparableValues } from '@/lib/domain/comparable';

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
