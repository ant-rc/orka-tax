import { describe, it, expect } from 'vitest';
import { simulateStatut, nextStatut, TUNNEL_ORDER } from './advance';

describe('simulateStatut', () => {
  it('returns anomalie when hasAnomaly is true', () => {
    expect(simulateStatut(true)).toBe('anomalie');
  });

  it('returns resolu when hasAnomaly is false', () => {
    expect(simulateStatut(false)).toBe('resolu');
  });
});

describe('nextStatut', () => {
  it('advances importe to rapprochement', () => {
    expect(nextStatut('importe')).toBe('rapprochement');
  });

  it('caps at remboursement when already at last stage', () => {
    expect(nextStatut('remboursement')).toBe('remboursement');
  });

  it('advances rapprochement to resolu', () => {
    expect(nextStatut('rapprochement')).toBe('resolu');
  });

  it('advances anomalie to reclamation', () => {
    expect(nextStatut('anomalie')).toBe('reclamation');
  });

  it('covers the full TUNNEL_ORDER sequence', () => {
    for (let i = 0; i < TUNNEL_ORDER.length - 1; i++) {
      expect(nextStatut(TUNNEL_ORDER[i])).toBe(TUNNEL_ORDER[i + 1]);
    }
  });
});
