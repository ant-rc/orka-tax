import { describe, it, expect } from 'vitest';
import { compareBien, buildComparisonRows } from './compare';
import { COMPARABLE_FIELDS, type ComparableValues } from '@/lib/domain/comparable';

const fisc: ComparableValues = {
  surface_m2: 28, nb_pieces: 3, nb_wc: 1, nb_baignoires: 0, nb_douches: 1,
  nb_bidets: 0, nb_eviers: 1, ascenseur: true, eau_courante: true, gaz: false, electricite: true,
};

describe('compareBien', () => {
  it('returns no anomaly when identical', () => {
    expect(compareBien(fisc, { ...fisc })).toEqual([]);
  });

  it('reports each differing field with fisc and new values', () => {
    const res = compareBien(fisc, { ...fisc, nb_douches: 0, surface_m2: 30 });
    expect(res).toHaveLength(2);
    expect(res).toContainEqual({ field: 'nb_douches', fiscValue: 1, newValue: 0 });
    expect(res).toContainEqual({ field: 'surface_m2', fiscValue: 28, newValue: 30 });
  });
});

describe('buildComparisonRows', () => {
  it('emits one row per comparable field with a label', () => {
    const rows = buildComparisonRows({ ...fisc }, { ...fisc });
    expect(rows).toHaveLength(COMPARABLE_FIELDS.length);
    expect(rows.every((r) => r.label.length > 0)).toBe(true);
  });

  it('marks matching fields and flags mismatches', () => {
    const working: ComparableValues = { ...fisc, nb_douches: 9, electricite: false };
    const rows = buildComparisonRows(working, fisc);
    const douches = rows.find((r) => r.field === 'nb_douches')!;
    expect(douches).toMatchObject({ working: 9, fisc: 1, match: false });
    const elec = rows.find((r) => r.field === 'electricite')!;
    expect(elec).toMatchObject({ working: false, fisc: true, match: false });
    const wc = rows.find((r) => r.field === 'nb_wc')!;
    expect(wc).toMatchObject({ working: 1, fisc: 1, match: true });
  });

  it('treats null and 0 as a mismatch', () => {
    const rows = buildComparisonRows({ ...fisc, nb_bidets: null }, { ...fisc, nb_bidets: 0 });
    expect(rows.find((r) => r.field === 'nb_bidets')!.match).toBe(false);
  });
});
