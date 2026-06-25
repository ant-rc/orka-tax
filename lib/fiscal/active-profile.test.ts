import { describe, it, expect } from 'vitest';
import { resolveActiveProfileId } from './active-profile';

describe('resolveActiveProfileId', () => {
  it('keeps the stored id when it belongs to the account', () => {
    expect(resolveActiveProfileId('b', ['a', 'b', 'c'])).toBe('b');
  });

  it('falls back to the first id when the stored id is unknown', () => {
    expect(resolveActiveProfileId('z', ['a', 'b'])).toBe('a');
  });

  it('falls back to the first id when nothing is stored', () => {
    expect(resolveActiveProfileId(null, ['a', 'b'])).toBe('a');
  });

  it('returns null when there are no profiles', () => {
    expect(resolveActiveProfileId('a', [])).toBeNull();
  });
});
