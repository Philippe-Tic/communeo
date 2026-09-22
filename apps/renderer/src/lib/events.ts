import { isoDay, type EventCardVM } from '@communeo/core';
import { FIXTURE_NOW } from '@communeo/fixtures';

/** Événements pas encore terminés, du plus proche au plus lointain. Avec les fixtures : date de référence fixe. */
export function upcomingEvents<T extends EventCardVM>(events: T[]): T[] {
  const today = isoDay(process.env.DATA_SOURCE === 'strapi' ? new Date() : FIXTURE_NOW);
  return events.filter((event) => isoDay((event.end ?? event.start).iso) >= today).sort((a, b) => a.start.iso.localeCompare(b.start.iso));
}
