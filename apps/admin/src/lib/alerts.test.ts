import { describe, expect, it } from 'vitest';
import { alertState, type Alert } from './alerts';

const alert = (fields: Partial<Alert>): Alert =>
  ({
    documentId: 'a',
    title: 'Coupure',
    message: '',
    severity: 'warning',
    active: true,
    display_from: null,
    display_until: null,
    ...fields,
  }) as Alert;

describe('alertState', () => {
  const now = new Date('2026-09-24T10:00:00Z');
  it('en cours, programmée, passée', () => {
    expect(
      alertState(alert({ display_from: '2026-09-24T09:00:00Z', display_until: '2026-09-24T12:00:00Z' }), now),
    ).toBe('active');
    expect(alertState(alert({ display_from: '2026-09-25T09:00:00Z' }), now)).toBe('scheduled');
    expect(alertState(alert({ display_until: '2026-09-24T09:00:00Z' }), now)).toBe('past');
  });
  it('terminée à la main : passée, même dans sa période', () => {
    expect(alertState(alert({ active: false, display_until: '2026-09-24T12:00:00Z' }), now)).toBe('past');
  });
});
