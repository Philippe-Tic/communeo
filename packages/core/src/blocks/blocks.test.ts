import { describe, expect, it } from 'vitest';
import { richTextDocumentSchema, shortRichTextDocumentSchema, validateBlocks } from './index';

const p = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const doc = (...content: unknown[]) => ({ type: 'doc', content });

describe('texte riche', () => {
  it('accepte titres H2/H3, listes, gras, italique et liens sûrs', () => {
    const value = doc(
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Tarifs' }] },
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Caution' }] },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Voir ', marks: [{ type: 'bold' }, { type: 'italic' }] },
          { type: 'text', text: 'le règlement', marks: [{ type: 'link', attrs: { href: '/reglement', target: null, rel: null } }] },
          { type: 'hardBreak' },
        ],
      },
      { type: 'bulletList', content: [{ type: 'listItem', content: [p('Tables'), { type: 'orderedList', content: [{ type: 'listItem', content: [p('Chaises')] }] }] }] },
    );
    expect(richTextDocumentSchema.safeParse(value).success).toBe(true);
  });

  it('refuse un titre de niveau 1', () => {
    const value = doc({ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Titre' }] });
    expect(richTextDocumentSchema.safeParse(value).success).toBe(false);
  });

  it('refuse un nœud non autorisé (HTML brut, image inline, alignement)', () => {
    expect(richTextDocumentSchema.safeParse(doc({ type: 'html', content: '<script>' })).success).toBe(false);
    expect(richTextDocumentSchema.safeParse(doc({ type: 'image', attrs: { src: 'x.png' } })).success).toBe(false);
    expect(richTextDocumentSchema.safeParse(doc({ type: 'paragraph', attrs: { textAlign: 'center' }, content: [] })).success).toBe(false);
  });

  it('refuse les liens javascript: et data:', () => {
    for (const href of ['javascript:alert(1)', 'data:text/html,x', '//evil.test']) {
      const value = doc({ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href } }] }] });
      expect(richTextDocumentSchema.safeParse(value).success, href).toBe(false);
    }
  });

  it('refuse les couleurs et autres marques', () => {
    const value = doc({ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'textStyle', attrs: { color: 'red' } }] }] });
    expect(richTextDocumentSchema.safeParse(value).success).toBe(false);
  });

  it('interdit les titres dans le texte court (FAQ, encadré)', () => {
    const value = doc({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'x' }] });
    expect(shortRichTextDocumentSchema.safeParse(value).success).toBe(false);
  });
});

describe('blocs', () => {
  const text = { __component: 'blocks.text', body: doc(p('Bonjour')) };

  it('accepte une page complète avec les 9 blocs à la publication', () => {
    const blocks = [
      text,
      { __component: 'blocks.image', image: 12, caption: 'La salle', width: 'full' },
      { __component: 'blocks.buttons', buttons: [{ label: 'Réserver', url: '/reserver', style: 'primary' }] },
      { __component: 'blocks.callout', variant: 'warning', title: 'Caution', body: doc(p('500 €')) },
      { __component: 'blocks.documents', title: 'À télécharger', files: [3, 4] },
      { __component: 'blocks.gallery', images: [5, 6, 7] },
      { __component: 'blocks.faq', items: [{ question: 'Anniversaire ?', answer: doc(p('Oui')) }] },
      { __component: 'blocks.contact', name: 'Espace Loire', email: 'mairie@example.fr', show_map: true },
      { __component: 'blocks.video', url: 'https://www.youtube.com/watch?v=abc', title: 'Visite virtuelle' },
    ];
    expect(validateBlocks(blocks, 'publish')).toEqual({ success: true, issues: [] });
  });

  it('accepte un brouillon incomplet mais refuse sa publication', () => {
    const blocks = [{ __component: 'blocks.image' }, { __component: 'blocks.gallery', images: [1] }];
    expect(validateBlocks(blocks, 'draft').success).toBe(true);
    const result = validateBlocks(blocks, 'publish');
    expect(result.success).toBe(false);
    expect(result.issues.map((i) => i.index)).toEqual([0, 1]);
  });

  it("bloc Image sans image : message clair ; image sans texte alternatif : signalée", () => {
    const missing = validateBlocks([{ __component: 'blocks.image' }], 'publish');
    expect(missing.issues.map((issue) => issue.message)).toEqual(['Choisissez une image']);
    const noAlt = validateBlocks([{ __component: 'blocks.image', image: { id: 3, alternativeText: '', mime: 'image/jpeg' } }], 'publish');
    expect(noAlt.issues.map((issue) => issue.message)).toEqual(["Texte alternatif manquant sur l'image"]);
    expect(validateBlocks([{ __component: 'blocks.image', image: 3 }], 'publish').success).toBe(true);
  });

  it('applique les limites hautes même en brouillon', () => {
    const buttons = Array.from({ length: 4 }, () => ({ label: 'x', url: '/x' }));
    expect(validateBlocks([{ __component: 'blocks.buttons', buttons }], 'draft').success).toBe(false);
    const images = Array.from({ length: 13 }, (_, i) => i + 1);
    expect(validateBlocks([{ __component: 'blocks.gallery', images }], 'draft').success).toBe(false);
  });

  it('refuse un type de bloc inconnu', () => {
    const result = validateBlocks([{ __component: 'blocks.html', html: '<b>x</b>' }], 'draft');
    expect(result.success).toBe(false);
  });

  it('refuse un texte vide à la publication', () => {
    expect(validateBlocks([{ __component: 'blocks.text', body: doc({ type: 'paragraph' }) }], 'publish').success).toBe(false);
  });

  it("exige le texte alternatif d'une image peuplée à la publication", () => {
    const image = { id: 1, alternativeText: '', mime: 'image/jpeg' };
    expect(validateBlocks([{ __component: 'blocks.image', image }], 'publish').success).toBe(false);
    expect(validateBlocks([{ __component: 'blocks.image', image: { ...image, alternativeText: 'La salle des fêtes' } }], 'publish').success).toBe(true);
  });

  it("n'exige pas de texte alternatif sur un PDF", () => {
    const file = { id: 2, alternativeText: null, mime: 'application/pdf' };
    expect(validateBlocks([{ __component: 'blocks.documents', files: [file] }], 'publish').success).toBe(true);
  });

  it("n'accepte que YouTube, Dailymotion et Vimeo pour la vidéo", () => {
    const video = (url: string) => [{ __component: 'blocks.video', url, title: 'x' }];
    expect(validateBlocks(video('https://vimeo.com/123'), 'publish').success).toBe(true);
    expect(validateBlocks(video('https://evil.test/video.mp4'), 'publish').success).toBe(false);
  });
});
