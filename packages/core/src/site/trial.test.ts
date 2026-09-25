import { describe, expect, it } from 'vitest';
import { addDays, deletionDate, trialDaysLeft } from './trial';

describe('période d’essai', () => {
  const now = new Date('2026-10-01T10:00:00Z');

  it('jours restants arrondis au jour supérieur', () => {
    expect(trialDaysLeft(addDays(now, 30), now)).toBe(30);
    expect(trialDaysLeft(new Date('2026-10-08T09:00:00Z'), now)).toBe(7);
    expect(trialDaysLeft(new Date('2026-10-01T11:00:00Z'), now)).toBe(1);
  });

  it('essai fini : zéro, jamais négatif', () => {
    expect(trialDaysLeft(now, now)).toBe(0);
    expect(trialDaysLeft(new Date('2026-09-01T00:00:00Z'), now)).toBe(0);
  });

  it('données supprimées 6 mois après la fin de l’essai', () => {
    expect(deletionDate('2026-10-01T10:00:00Z').toISOString()).toBe('2027-04-02T10:00:00.000Z');
  });
});
