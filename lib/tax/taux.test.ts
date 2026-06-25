import { describe, it, expect } from 'vitest';
import { resolveTaux, etageCoefficient, TAUX_PAR_COMMUNE } from './taux';

describe('taux', () => {
  it('has a real rate per known commune (by depcom)', () => {
    expect(TAUX_PAR_COMMUNE['75111']).toBeGreaterThan(0); // Paris 11e
    expect(TAUX_PAR_COMMUNE['94077']).toBeGreaterThan(0); // Villeneuve-le-Roi
  });

  it('ground floor coefficient is 1', () => {
    expect(etageCoefficient('0')).toBe(1);
  });

  it('higher floors raise the coefficient', () => {
    expect(etageCoefficient('3')).toBeGreaterThan(etageCoefficient('0'));
  });

  it('resolveTaux multiplies commune rate by the étage coefficient', () => {
    expect(resolveTaux('75111', '0')).toBeCloseTo(TAUX_PAR_COMMUNE['75111']);
    expect(resolveTaux('75111', '3')).toBeCloseTo(TAUX_PAR_COMMUNE['75111'] * etageCoefficient('3'));
  });

  it('falls back to the default rate for an unknown commune', () => {
    expect(resolveTaux('00000', '0')).toBeGreaterThan(0);
  });
});
