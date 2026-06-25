import { describe, it, expect } from 'vitest';
import { evaluateBien, type EvaluateInput } from './evaluate';
import type { ComparableValues } from '@/lib/domain/comparable';

const fisc: ComparableValues = {
  surface_m2: 28, nb_pieces: 3, nb_wc: 1, nb_baignoires: 0, nb_douches: 1,
  nb_bidets: 0, nb_eviers: 1, ascenseur: false, eau_courante: true, gaz: false, electricite: true,
};
const baseInput = (working: ComparableValues): EvaluateInput => ({
  fisc, working, ponderation_nature: 1, categorie: '6',
  coeff_entretien: 1, coeff_situation_particuliere: 1, coeff_situation_generale: 1,
  depcom: '75111', etage: '0',
});

describe('evaluateBien', () => {
  it('is resolu with 0 dégrèvement when unchanged', () => {
    const r = evaluateBien(baseInput({ ...fisc }));
    expect(r.statut).toBe('resolu');
    expect(r.anomalies).toEqual([]);
    expect(r.degrevement).toBe(0);
  });

  it('is anomalie with a POSITIVE dégrèvement when a shower is removed (lower VLC)', () => {
    const r = evaluateBien(baseInput({ ...fisc, nb_douches: 0 }));
    expect(r.statut).toBe('anomalie');
    expect(r.anomalies).toHaveLength(1);
    expect(r.degrevement).toBeGreaterThan(0);
  });

  it('is anomalie with a NEGATIVE dégrèvement when surface increases (higher VLC)', () => {
    const r = evaluateBien(baseInput({ ...fisc, surface_m2: 40 }));
    expect(r.statut).toBe('anomalie');
    expect(r.degrevement).toBeLessThan(0);
  });
});
