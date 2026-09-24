import { describe, expect, it } from 'vitest';
import { isInactive } from './equipe';

describe('isInactive', () => {
  const now = new Date('2026-09-24T10:00:00Z').getTime();
  it('signalée après 30 jours sans activité', () => {
    expect(isInactive({ lastActivity: '2026-08-26T09:00:00Z' }, now)).toBe(false);
    expect(isInactive({ lastActivity: '2026-08-24T09:00:00Z' }, now)).toBe(true);
  });
});
