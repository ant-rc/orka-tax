import { describe, it, expect } from 'vitest';
import { compareBien } from './compare';
import type { ComparableValues } from '@/lib/domain/comparable';

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
