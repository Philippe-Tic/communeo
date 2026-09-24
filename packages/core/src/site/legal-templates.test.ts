import { describe, expect, it } from 'vitest';
import { richTextDocumentSchema } from '../blocks/rich-text';
import { isRichTextEmpty } from '../blocks';
import { accessibilityDeclarationTemplate, privacyPolicyTemplate } from './legal-templates';

describe('textes pré-remplis', () => {
  it('politique de données : texte riche valide, au nom de la commune', () => {
    const doc = privacyPolicyTemplate({ communeName: 'Saint-Pierre-le-Moûtier' });
    expect(richTextDocumentSchema.safeParse(doc).success).toBe(true);
    expect(isRichTextEmpty(doc)).toBe(false);
    expect(JSON.stringify(doc)).toContain('La mairie de Saint-Pierre-le-Moûtier collecte');
  });

  it('déclaration d’accessibilité : texte riche valide, datée, sans prétendre à un audit', () => {
    const doc = accessibilityDeclarationTemplate({ date: new Date('2026-09-24T10:00:00Z') });
    expect(richTextDocumentSchema.safeParse(doc).success).toBe(true);
    expect(JSON.stringify(doc)).toContain('établie le 24 septembre 2026');
    expect(JSON.stringify(doc)).toContain("pas encore fait l'objet d'un audit");
  });
});
