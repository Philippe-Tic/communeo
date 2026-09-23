import { describe, expect, it } from 'vitest';
import { previewSettingsSchema } from './settings';

describe('previewSettingsSchema', () => {
  it('accepte un menu valide', () => {
    const settings = { navigation_config: { main: [{ type: 'section', section: 'agenda' }], footer: [] } };
    expect(previewSettingsSchema.parse(settings)).toEqual(settings);
  });

  it('refuse les autres champs du Site et un menu invalide', () => {
    expect(previewSettingsSchema.safeParse({ name: 'Autre nom' }).success).toBe(false);
    expect(previewSettingsSchema.safeParse({ navigation_config: { main: [{ type: 'external', url: 'javascript:alert(1)', label: 'x' }] } }).success).toBe(false);
  });
});
