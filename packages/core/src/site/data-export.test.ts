import { describe, expect, it } from 'vitest';
import {
  blocksToHtml,
  dataExportExpiry,
  dataExportFileName,
  dataExportInProgress,
  exportHtmlDocument,
  exportReadme,
  publicationLabel,
  richTextToHtml,
  toCsv,
} from './data-export';

describe('export des données (#343)', () => {
  it('archive gardée 7 jours, nom avec la commune et la date', () => {
    expect(dataExportExpiry('2026-10-02T08:00:00.000Z').toISOString()).toBe('2026-10-09T08:00:00.000Z');
    expect(dataExportFileName('saint-aubin', '2026-10-02T23:30:00.000Z')).toBe('communeo-export-saint-aubin-2026-10-02.zip');
    expect(dataExportInProgress('queued')).toBe(true);
    expect(dataExportInProgress('running')).toBe(true);
    expect(dataExportInProgress('ready')).toBe(false);
    expect(dataExportInProgress(null)).toBe(false);
  });

  it('statut de publication : brouillon, publié, publié avec des modifications plus récentes', () => {
    expect(publicationLabel({ updatedAt: '2026-10-01' }, null)).toBe('brouillon');
    expect(publicationLabel({ updatedAt: '2026-10-01T10:00:00Z' }, { updatedAt: '2026-10-01T10:00:00Z' })).toBe('publié');
    expect(publicationLabel({ updatedAt: '2026-10-02T10:00:00Z' }, { updatedAt: '2026-10-01T10:00:00Z' })).toBe('publié, modifications en brouillon');
  });

  it('texte riche → HTML : titres, marques, liens, listes imbriquées, texte échappé', () => {
    const html = richTextToHtml({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Horaires <été>' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Ouvert ', marks: [{ type: 'bold' }] },
            { type: 'hardBreak' },
            { type: 'text', text: 'ici', marks: [{ type: 'link', attrs: { href: 'https://example.fr/?a=1&b=2' } }] },
          ],
        },
        {
          type: 'orderedList',
          attrs: { start: 3 },
          content: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'un' }] },
                { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'deux' }] }] }] },
              ],
            },
          ],
        },
      ],
    });
    expect(html).toBe(
      '<h2>Horaires &lt;été&gt;</h2>\n<p><strong>Ouvert </strong><br><a href="https://example.fr/?a=1&amp;b=2">ici</a></p>\n<ol start="3"><li>un<ul><li>deux</li></ul></li></ol>',
    );
    expect(richTextToHtml(null)).toBe('');
    expect(richTextToHtml('pas un document')).toBe('');
  });

  it('blocs → HTML, avec les fichiers de l’archive et leur texte alternatif', () => {
    const media = (file: unknown) => {
      const f = file as { id: number; name: string; alternativeText?: string | null } | null;
      return f ? { href: `../../fichiers/${f.id}-${f.name}`, name: f.name, alt: f.alternativeText ?? null, mime: null } : null;
    };
    const html = blocksToHtml(
      [
        { __component: 'blocks.text', body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bonjour' }] }] } },
        { __component: 'blocks.image', image: { id: 4, name: 'mairie.jpg', alternativeText: 'La mairie' }, caption: 'Façade' },
        { __component: 'blocks.documents', title: 'Comptes rendus', files: [{ id: 5, name: 'cr.pdf' }, null] },
        { __component: 'blocks.callout', variant: 'warning', body: null },
        { __component: 'blocks.faq', items: [{ question: 'Quand ?', answer: null }] },
        { __component: 'blocks.contact', name: 'Accueil', phone: '03 86 00 00 00' },
        { __component: 'blocks.video', url: 'https://vimeo.com/1', title: 'Le village', transcript: 'Texte' },
        { __component: 'blocks.inconnu' },
      ],
      media,
    );
    expect(html).toContain('<p>Bonjour</p>');
    expect(html).toContain('<figure><img src="../../fichiers/4-mairie.jpg" alt="La mairie"><figcaption>Façade</figcaption></figure>');
    expect(html).toContain('<h2>Comptes rendus</h2><ul><li><a href="../../fichiers/5-cr.pdf">cr.pdf</a></li></ul>');
    expect(html).toContain('<aside><p><strong>Attention</strong></p></aside>');
    expect(html).toContain('<details><summary>Quand ?</summary></details>');
    expect(html).toContain('<address><strong>Accueil</strong><br>03 86 00 00 00</address>');
    expect(html).toContain('<a href="https://vimeo.com/1">Le village</a>');
    expect(blocksToHtml(null, media)).toBe('');
  });

  it('page HTML autonome, titre et commune échappés', () => {
    const page = exportHtmlDocument({ title: 'A & B', communeName: 'Saint-Aubin', details: ['Publié', ''], body: '<p>x</p>' });
    expect(page).toContain('<html lang="fr">');
    expect(page).toContain('<title>A &amp; B — Saint-Aubin</title>');
    expect(page).toContain('<p><small>Publié</small></p>');
  });

  it('CSV pour tableur français : BOM, point-virgule, guillemets, retours à la ligne', () => {
    const csv = toCsv(
      [
        { label: 'Nom', value: (row: { name: string; note: string | null; at: Date }) => row.name },
        { label: 'Note', value: (row) => row.note },
        { label: 'Date', value: (row) => row.at },
      ],
      [{ name: 'Durand; Marie', note: 'Il a dit "oui"\nmerci', at: new Date('2026-10-02T08:00:00.000Z') }, { name: 'Léa', note: null, at: new Date(0) }],
    );
    expect(csv).toBe(
      '﻿Nom;Note;Date\r\n"Durand; Marie";"Il a dit ""oui""\nmerci";2026-10-02T08:00:00.000Z\r\nLéa;;1970-01-01T00:00:00.000Z\r\n',
    );
  });

  it('LISEZMOI : contenu de l’archive, site publié ou raison de son absence, fichiers manquants', () => {
    const readme = exportReadme({
      communeName: 'Saint-Aubin-sur-Loire',
      generatedAt: '2026-10-02T08:00:00.000Z',
      publishedSite: { included: false, reason: 'le site est hébergé chez Netlify.' },
      counts: { pages: 4, files: 12, messages: 3 },
      missingFiles: 1,
    });
    expect(readme).toContain('# Données de la commune Saint-Aubin-sur-Loire');
    expect(readme).toContain('le 2 octobre 2026');
    expect(readme).toContain('Le site publié n’est pas inclus : le site est hébergé chez Netlify.');
    expect(readme).toContain('`pages.json` (4)');
    expect(readme).toContain('les 12 fichiers d’origine');
    expect(readme).toContain('1 fichier(s) introuvable(s)');
    expect(readme).toContain('`messages.csv` (3)');
    expect(exportReadme({ communeName: 'X', generatedAt: new Date(), publishedSite: { included: true }, counts: {}, missingFiles: 0 })).toContain(
      '`site-publie/`',
    );
  });
});
