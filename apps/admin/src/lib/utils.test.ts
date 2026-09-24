import { describe, expect, it } from 'vitest';
import { initials } from './utils';

describe('initials', () => {
  it('deux mots significatifs, articles et « sur » ignorés', () => {
    expect(initials('Saint-Aubin-sur-Loire')).toBe('SA');
    expect(initials('Sophie Leroy')).toBe('SL');
    expect(initials('Les Essarts')).toBe('E');
    expect(initials('')).toBe('?');
  });
});
