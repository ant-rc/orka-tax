import { describe, it, expect } from 'vitest';
import { COMPARABLE_FIELDS, bienSignature, type ComparableValues } from './comparable';

const base: ComparableValues = {
  surface_m2: 28, nb_pieces: 3, nb_wc: 1, nb_baignoires: 0, nb_douches: 1,
  nb_bidets: 0, nb_eviers: 1, ascenseur: true, eau_courante: true, gaz: false, electricite: true,
};

describe('comparable', () => {
  it('exposes the 11 comparable fields', () => {
    expect(COMPARABLE_FIELDS).toHaveLength(11);
    expect(COMPARABLE_FIELDS).toContain('surface_m2');
    expect(COMPARABLE_FIELDS).toContain('electricite');
  });

  it('gives identical biens the same signature', () => {
    expect(bienSignature(base)).toBe(bienSignature({ ...base }));
  });

  it('gives a different signature when any comparable field differs', () => {
    expect(bienSignature(base)).not.toBe(bienSignature({ ...base, nb_douches: 0 }));
  });

  it('treats null distinctly from 0', () => {
    expect(bienSignature(base)).not.toBe(bienSignature({ ...base, nb_bidets: null }));
  });
});
