import { describe, expect, it } from 'vitest';
import { emptyOpeningHours, openingHoursSchema, openingStatusAt, openingStatusLabel, summarizeWeek, type OpeningHours } from './opening-hours';

const mairie: OpeningHours = {
  ...emptyOpeningHours(),
  days: {
    monday: [{ open: '09:00', close: '12:00' }, { open: '14:00', close: '17:30' }],
    tuesday: [{ open: '09:00', close: '12:00' }, { open: '14:00', close: '17:30' }],
    wednesday: [{ open: '09:00', close: '12:00' }],
    thursday: [{ open: '09:00', close: '12:00' }, { open: '14:00', close: '17:30' }],
    friday: [{ open: '09:00', close: '12:00' }, { open: '14:00', close: '17:30' }],
    saturday: [{ open: '09:00', close: '12:00' }],
    sunday: [],
  },
  closures: [{ date: '2026-12-25', label: 'Noël' }],
};

// Heures d'été : Paris = UTC+2
const at = (local: string) => new Date(`${local}+02:00`);

describe('horaires de la mairie', () => {
  it('regroupe les jours identiques consécutifs', () => {
    expect(summarizeWeek(mairie)).toEqual([
      { days: 'Lun–Mar', hours: '9h–12h / 14h–17h30' },
      { days: 'Mer', hours: '9h–12h' },
      { days: 'Jeu–Ven', hours: '9h–12h / 14h–17h30' },
      { days: 'Sam', hours: '9h–12h' },
    ]);
  });

  it('calcule le statut ouvert / fermé', () => {
    expect(openingStatusLabel(openingStatusAt(mairie, at('2026-09-21T10:15:00')))).toBe('Ouverte · ferme à 12h');
    expect(openingStatusLabel(openingStatusAt(mairie, at('2026-09-21T12:30:00')))).toBe('Fermée · ouvre à 14h');
    expect(openingStatusLabel(openingStatusAt(mairie, at('2026-09-21T18:00:00')))).toBe('Fermée · ouvre demain à 9h');
    expect(openingStatusLabel(openingStatusAt(mairie, at('2026-09-26T13:00:00')))).toBe('Fermée · ouvre lundi à 9h');
  });

  it('tient compte des fermetures exceptionnelles', () => {
    const status = openingStatusAt(mairie, new Date('2026-12-25T10:00:00+01:00'));
    expect(status.open).toBe(false);
  });

  it('refuse une plage incohérente', () => {
    const invalid = { ...mairie, days: { ...mairie.days, monday: [{ open: '14:00', close: '09:00' }] } };
    expect(openingHoursSchema.safeParse(invalid).success).toBe(false);
  });
});
