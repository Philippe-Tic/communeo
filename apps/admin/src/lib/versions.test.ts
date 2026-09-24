import { describe, expect, it } from 'vitest';
import { blockExcerpt, plainText, versionDateText } from './versions';

const doc = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });

describe('versions', () => {
  it('date d’une version dans une phrase', () => {
    expect(versionDateText("Aujourd'hui, 09:12")).toBe("d'aujourd'hui, 09:12");
    expect(versionDateText('Hier, 17:40')).toBe("d'hier, 17:40");
    expect(versionDateText('18 sept., 11:05')).toBe('du 18 sept., 11:05');
  });

  it('contenu d’un bloc en une ligne', () => {
    expect(plainText(doc('Réservation en mairie.'))).toBe('Réservation en mairie.');
    expect(blockExcerpt({ __component: 'blocks.text', body: doc('Bonjour') })).toBe('Bonjour');
    expect(blockExcerpt({ __component: 'blocks.gallery', title: 'La fête', images: [1, 2, 3] })).toBe(
      'La fête — 3 images',
    );
    expect(blockExcerpt({ __component: 'blocks.documents', files: [1] })).toBe('1 fichier');
    expect(
      blockExcerpt({ __component: 'blocks.buttons', buttons: [{ label: 'Réserver' }, { label: 'Contact' }] }),
    ).toBe('Réserver, Contact');
    expect(blockExcerpt({ __component: 'blocks.text', body: doc('x'.repeat(200)) })).toHaveLength(140);
  });
});
