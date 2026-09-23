import { describe, expect, it } from 'vitest';
import { rgpdDaysLeft, rgpdDeadline, rgpdReplyTemplate } from './rgpd';

describe('échéance RGPD', () => {
  it('un mois après la réception, fin de mois ramenée au dernier jour', () => {
    expect(rgpdDeadline('2026-09-22T07:14:00Z').toISOString().slice(0, 10)).toBe('2026-10-22');
    expect(rgpdDeadline('2027-01-31T10:00:00Z').toISOString().slice(0, 10)).toBe('2027-02-28');
    expect(rgpdDeadline('2028-01-31T10:00:00Z').toISOString().slice(0, 10)).toBe('2028-02-29');
    expect(rgpdDeadline('2026-12-15T10:00:00Z').toISOString().slice(0, 10)).toBe('2027-01-15');
    // Reçu le 23 à 0 h 30, heure de Paris (le 22 en UTC) : échéance le 23 du mois suivant
    expect(rgpdDeadline('2026-09-22T22:30:00Z').toISOString().slice(0, 10)).toBe('2026-10-23');
  });

  it('jours restants, comptés à Paris', () => {
    expect(rgpdDaysLeft('2026-09-22T07:14:00Z', new Date('2026-09-24T10:00:00Z'))).toBe(28);
    expect(rgpdDaysLeft('2026-09-22T07:14:00Z', new Date('2026-10-22T21:30:00Z'))).toBe(0);
    expect(rgpdDaysLeft('2026-09-22T07:14:00Z', new Date('2026-10-25T09:00:00Z'))).toBe(-3);
  });

  it('modèle de réponse nominatif', () => {
    expect(rgpdReplyTemplate({ firstName: 'Marc', lastName: 'Dubois', siteName: 'Saint-Aubin' })).toContain('Bonjour Marc Dubois,');
  });
});
