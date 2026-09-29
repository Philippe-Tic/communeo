import { describe, expect, it } from 'vitest';
import { blocksExcerpt, describe as describeText, homeTitle, mairieOf, ofCommune, shareImage, truncate } from './seo';
import type { BlockVM, ImageVM } from './types';

describe('nom de la mairie', () => {
  it.each([
    ['Saint-Aubin-sur-Loire', 'Mairie de Saint-Aubin-sur-Loire'],
    ['Arles', 'Mairie d’Arles'],
    ['Évreux', 'Mairie d’Évreux'],
    ['Le Mans', 'Mairie du Mans'],
    ['Les Andelys', 'Mairie des Andelys'],
    ['La Rochelle', 'Mairie de La Rochelle'],
    ['Honfleur', 'Mairie de Honfleur'],
    ['Mairie de Test', 'Mairie de Test'],
  ])('%s → %s', (name, expected) => {
    expect(mairieOf(name)).toBe(expected);
  });

  it('le nom après « de » : le site d’Imphy, du Mans', () => {
    expect(`Le site ${ofCommune('Imphy')}`).toBe('Le site d’Imphy');
    expect(ofCommune('Le Mans')).toBe('du Mans');
    expect(ofCommune('Decize')).toBe('de Decize');
  });

  it('titre de l’accueil', () => {
    expect(homeTitle('Arles')).toBe('Mairie d’Arles – site officiel');
  });
});

describe('descriptions', () => {
  it('coupe au mot, sans ponctuation pendante', () => {
    const text = 'Les travaux de la rue des Écoles commencent lundi, la circulation sera alternée pendant deux semaines. '.repeat(3);
    const cut = truncate(text);
    expect(cut.length).toBeLessThanOrEqual(155);
    expect(cut.endsWith('…')).toBe(true);
    expect(cut).not.toMatch(/[,.] …$/);
  });

  it('extrait du contenu : paragraphes et encadrés, sans les intertitres', () => {
    const blocks = [
      { type: 'text', id: '1', body: { type: 'doc', content: [{ type: 'heading', attrs: { level: 2, id: 'programme' }, content: [{ type: 'text', text: 'Programme' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'Concert de' }, { type: 'text', text: ' l’harmonie.' }] }] } },
      { type: 'callout', id: '2', variant: 'info', variantLabel: 'Info', title: null, body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Entrée libre.' }] }] } },
    ] as unknown as BlockVM[];
    expect(blocksExcerpt(blocks)).toBe('Concert de l’harmonie. Entrée libre.');
    expect(blocksExcerpt([])).toBeNull();
  });

  it('première description non vide', () => {
    expect(describeText(null, '  ', 'Résumé')).toBe('Résumé');
    expect(describeText(null, undefined)).toBeNull();
  });
});

describe('image de partage', () => {
  const photo: ImageVM = {
    src: 'https://app.test/uploads/photo.jpg',
    alt: 'La place du marché',
    width: 4000,
    height: 3000,
    srcset: 'https://app.test/uploads/small_photo.jpg 500w, https://app.test/uploads/medium_photo.jpg 750w, https://app.test/uploads/large_photo.jpg 1000w, https://app.test/uploads/photo.jpg 4000w',
    caption: null,
    credit: null,
  };

  it('la variante redimensionnée la plus grande sous 1600 px, hauteur proportionnelle', () => {
    expect(shareImage(photo)).toEqual({ src: 'https://app.test/uploads/large_photo.jpg', width: 1000, height: 750, alt: 'La place du marché' });
  });

  it('jamais de SVG : l’image générée de la commune prend le relais', () => {
    expect(shareImage({ ...photo, src: '/fixtures/place.svg', srcset: null })).toBeNull();
    expect(shareImage(null)).toBeNull();
  });

  it('petite image sans variantes : l’original', () => {
    expect(shareImage({ ...photo, width: 800, height: 600, srcset: null })).toEqual({ src: photo.src, width: 800, height: 600, alt: photo.alt });
  });
});
