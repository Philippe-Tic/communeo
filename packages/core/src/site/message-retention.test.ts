import { describe, expect, it } from 'vitest';
import { siteMessageRetentionValues } from '../generated/strapi';
import {
  MESSAGE_RETENTIONS,
  effectiveMessageRetention,
  isMessageRetentionChosen,
  messageRetentionCutoff,
  messageRetentionSummary,
} from './message-retention';

describe('durée de conservation des messages', () => {
  it('mêmes valeurs que le champ `message_retention` du Site', () => {
    expect([...MESSAGE_RETENTIONS]).toEqual([...siteMessageRetentionValues]);
  });

  it('1 an par défaut tant que la commune n’a rien choisi', () => {
    expect(effectiveMessageRetention(null)).toBe('months_12');
    expect(effectiveMessageRetention('n’importe quoi')).toBe('months_12');
    expect(effectiveMessageRetention('never')).toBe('never');
    expect(isMessageRetentionChosen(null)).toBe(false);
    expect(isMessageRetentionChosen('never')).toBe(true);
  });

  it('date limite : même jour N mois plus tôt, dernier jour du mois s’il n’existe pas', () => {
    const now = new Date('2027-08-31T03:00:00Z');
    expect(messageRetentionCutoff('months_6', now)?.toISOString()).toBe('2027-02-28T03:00:00.000Z');
    expect(messageRetentionCutoff('months_12', now)?.toISOString()).toBe('2026-08-31T03:00:00.000Z');
    expect(messageRetentionCutoff(null, now)?.toISOString()).toBe('2026-08-31T03:00:00.000Z');
    expect(messageRetentionCutoff('months_36', now)?.toISOString()).toBe('2024-08-31T03:00:00.000Z');
    expect(messageRetentionCutoff('months_24', new Date('2028-02-29T03:00:00Z'))?.toISOString()).toBe(
      '2026-02-28T03:00:00.000Z',
    );
    expect(messageRetentionCutoff('never', now)).toBeNull();
  });

  it('résumé pour l’admin', () => {
    expect(messageRetentionSummary('months_24')).toBe('Les messages traités sont supprimés automatiquement après 2 ans.');
    expect(messageRetentionSummary('never')).toBe('Les messages traités ne sont jamais supprimés automatiquement.');
  });
});
