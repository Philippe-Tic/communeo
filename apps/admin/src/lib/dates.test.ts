// Fuseau de test : New York (vitest.config.ts) — les dates de l'admin doivent rester à l'heure de Paris
import { describe, expect, it } from 'vitest';
import { dateToParis, formatDayTime, formatListDate, parisToDate, relativeTime } from './dates';

describe('parisToDate / dateToParis', () => {
  it('heure de Paris, été comme hiver, quel que soit le fuseau du navigateur', () => {
    expect(parisToDate('2026-07-14', '09:30').toISOString()).toBe('2026-07-14T07:30:00.000Z');
    expect(parisToDate('2026-12-24', '18:00').toISOString()).toBe('2026-12-24T17:00:00.000Z');
    expect(dateToParis(new Date('2026-07-14T07:30:00Z'))).toEqual({ day: '2026-07-14', time: '09:30' });
  });

  it('aller-retour stable autour des changements d’heure', () => {
    for (const [day, time] of [
      ['2026-03-29', '03:30'],
      ['2026-10-25', '01:30'],
      ['2026-10-25', '04:00'],
    ] as const)
      expect(dateToParis(parisToDate(day, time))).toEqual({ day, time });
  });
});

describe('formatListDate', () => {
  const now = new Date('2026-09-24T10:00:00+02:00');
  it("aujourd'hui, hier, cette année, une autre année", () => {
    expect(formatListDate(new Date('2026-09-24T09:12:00+02:00'), now)).toBe("Aujourd'hui, 09:12");
    expect(formatListDate(new Date('2026-09-23T17:40:00+02:00'), now)).toBe('Hier, 17:40');
    expect(formatListDate(new Date('2026-09-18T11:05:00+02:00'), now)).toBe('18 sept., 11:05');
    expect(formatListDate(new Date('2025-03-03T11:05:00+01:00'), now)).toBe('3 mars 2025');
  });
  it('minuit à Paris est déjà le lendemain', () => {
    expect(formatListDate(new Date('2026-09-23T22:30:00Z'), now)).toBe("Aujourd'hui, 00:30");
  });
});

describe('relativeTime / formatDayTime', () => {
  const now = new Date('2026-09-24T10:00:00Z');
  it('secondes, minutes, heures', () => {
    expect(relativeTime(new Date('2026-09-24T09:59:58Z'), now)).toBe("à l'instant");
    expect(relativeTime(new Date('2026-09-24T09:59:30Z'), now)).toBe('il y a 30 s');
    expect(relativeTime(new Date('2026-09-24T09:55:00Z'), now)).toBe('il y a 5 min');
    expect(relativeTime(new Date('2026-09-24T07:00:00Z'), now)).toBe('il y a 3 h');
  });
  it("l'année n'est écrite que si ce n'est pas l'année en cours", () => {
    expect(formatDayTime(new Date('2026-09-22T07:14:00Z'), now)).toBe('22 septembre à 09:14');
    expect(formatDayTime(new Date('2027-01-05T08:00:00Z'), now)).toBe('5 janvier 2027 à 09:00');
  });
});
