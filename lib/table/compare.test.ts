import { describe, expect, it } from 'vitest';
import { compareAlphaNum } from './compare';

describe('compareAlphaNum', () => {
  it('sorts numeric-aware: 28m2 before 42m2', () => {
    expect(compareAlphaNum('28m2', '42m2')).toBeLessThan(0);
  });

  it('sorts alphabetical: Lyon before Paris', () => {
    expect(compareAlphaNum('Lyon', 'Paris')).toBeLessThan(0);
  });

  it('sorts numeric parts correctly: Étage 2 before Étage 10', () => {
    expect(compareAlphaNum('Étage 2', 'Étage 10')).toBeLessThan(0);
  });

  it('equal strings return 0', () => {
    expect(compareAlphaNum('Paris', 'Paris')).toBe(0);
  });
});
