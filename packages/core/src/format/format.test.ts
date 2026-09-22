import { describe, expect, it } from 'vitest';
import { formatDate, formatEventPeriod, formatFileLabel, formatHour, formatLongDate } from './index';

describe('dates en français (fuseau Europe/Paris)', () => {
  it('formate une date', () => {
    expect(formatDate('2026-06-24T10:00:00.000Z')).toBe('24 juin 2026');
    expect(formatLongDate('2026-10-05T12:00:00.000Z')).toBe('Lundi 5 octobre 2026');
  });

  it('formate les heures à la française', () => {
    expect(formatHour('2026-10-03T12:00:00.000Z')).toBe('14h');
    expect(formatHour('2026-10-03T18:30:00.000Z')).toBe('20h30');
  });

  it('décrit la période des événements', () => {
    expect(formatEventPeriod('2026-10-03T12:00:00.000Z', '2026-10-03T16:00:00.000Z')).toBe('Samedi 3 octobre 2026, de 14h à 18h');
    expect(formatEventPeriod('2026-10-03T18:30:00.000Z')).toBe('Samedi 3 octobre 2026 à 20h30');
    expect(formatEventPeriod('2026-07-12T08:00:00.000Z', '2026-07-14T20:00:00.000Z')).toBe('Du 12 au 14 juillet 2026');
    expect(formatEventPeriod('2026-06-30T08:00:00.000Z', '2026-07-02T20:00:00.000Z')).toBe('Du 30 juin au 2 juillet 2026');
    expect(formatEventPeriod('2026-12-31T08:00:00.000Z', '2027-01-02T20:00:00.000Z')).toBe('Du 31 décembre 2026 au 2 janvier 2027');
  });

  it('décrit un fichier à télécharger', () => {
    expect(formatFileLabel('.pdf', 1234.5)).toBe('PDF – 1,2 Mo');
    expect(formatFileLabel('.pdf', 240.2)).toBe('PDF – 240 Ko');
  });
});
