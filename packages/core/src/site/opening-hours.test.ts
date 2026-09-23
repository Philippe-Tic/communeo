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

  it('fermeture sur une période : fermée pendant, réouverture datée au-delà d\'une semaine', () => {
    const holidays: OpeningHours = { ...mairie, closures: [{ date: '2026-12-24', end: '2027-01-02', label: "Congés de fin d'année" }] };
    const during = openingStatusAt(holidays, new Date('2026-12-28T10:00:00+01:00'));
    expect(during).toMatchObject({ open: false, closure: "Congés de fin d'année" });
    expect(openingStatusLabel(during)).toBe('Fermée · ouvre le 4 janvier à 9h');
    // Veille de la période : réouverture le 4 janvier (lundi), plus d'une semaine après
    expect(openingStatusLabel(openingStatusAt(holidays, new Date('2026-12-23T18:00:00+01:00')))).toBe('Fermée · ouvre le 4 janvier à 9h');
    // Le jour suivant fermé n'est pas annoncé comme « demain »
    expect(openingStatusLabel(openingStatusAt(mairie, new Date('2026-12-24T18:00:00+01:00')))).toBe('Fermée · ouvre samedi à 9h');
  });

  it('refuse une période qui finit avant de commencer', () => {
    expect(openingHoursSchema.safeParse({ ...mairie, closures: [{ date: '2026-12-24', end: '2026-12-20' }] }).success).toBe(false);
  });

  it('refuse deux plages qui se chevauchent', () => {
    const overlap = { ...mairie, days: { ...mairie.days, monday: [{ open: '09:00', close: '12:00' }, { open: '11:00', close: '13:00' }] } };
    const result = openingHoursSchema.safeParse(overlap);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ message: 'Deux plages se chevauchent', path: ['days', 'monday', 1] });
  });

  it('refuse une plage incohérente', () => {
    const invalid = { ...mairie, days: { ...mairie.days, monday: [{ open: '14:00', close: '09:00' }] } };
    expect(openingHoursSchema.safeParse(invalid).success).toBe(false);
  });
});
