import { describe, expect, it } from 'vitest';
import { COMMUNE_DELETION_DAYS, communeDeletionDate, deletionConfirmed } from './commune-deletion';

describe('suppression d’une commune', () => {
  it('a lieu 7 jours après la demande', () => {
    expect(COMMUNE_DELETION_DAYS).toBe(7);
    expect(communeDeletionDate('2026-10-02T10:00:00Z').toISOString()).toBe('2026-10-09T10:00:00.000Z');
  });

  it('se confirme en tapant le nom de la commune, casse et espaces ignorés', () => {
    expect(deletionConfirmed('Saint-Aubin-sur-Loire', 'Saint-Aubin-sur-Loire')).toBe(true);
    expect(deletionConfirmed('  saint-aubin-SUR-loire ', 'Saint-Aubin-sur-Loire')).toBe(true);
    expect(deletionConfirmed('Gournay  en Bray', 'Gournay en Bray')).toBe(true);
  });

  it('refuse un autre nom, un nom vide ou sans accents', () => {
    expect(deletionConfirmed('Saint-Aubin', 'Saint-Aubin-sur-Loire')).toBe(false);
    expect(deletionConfirmed('', '')).toBe(false);
    expect(deletionConfirmed(undefined, 'Rouen')).toBe(false);
    expect(deletionConfirmed('Deville-les-Rouen', 'Déville-lès-Rouen')).toBe(false);
  });
});
