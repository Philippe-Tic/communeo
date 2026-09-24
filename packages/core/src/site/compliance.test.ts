import { describe, expect, it } from 'vitest';
import { computeCompliance, hasText, type ComplianceInput } from './compliance';

const doc = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }] });

const complete: ComplianceInput = {
  site: {
    name: 'Saint-Aubin-sur-Loire',
    address: '1 place de la Mairie, 58300 Saint-Aubin-sur-Loire',
    contact_mail: 'mairie@saint-aubin.fr',
    mentions_legales: { siret: '21580001200017', publication_director: 'Jean Moreau', hebergeur_name: 'Netlify', credits: doc('Photos : mairie') },
    rgpd: { rgpd_policy: doc('Données collectées…'), dpo_name: 'CDG 58', dpo_email: 'dpo@cdg58.fr' },
    accessibilite: {
      accessibility_level: 'partiellement-conforme',
      accessibility_schema_url: 'https://exemple.fr/schema.pdf',
      accessibility_action_plan_url: 'https://exemple.fr/plan.pdf',
    },
  },
  documents: [
    { document_type: 'pv-conseil-municipal', year: 2026 },
    { document_type: 'deliberation', year: 2026 },
    { document_type: 'budget-primitif', year: 2026 },
  ],
  imagesWithoutAlt: 0,
  openRgpdRequests: [],
  now: new Date('2026-09-24T10:00:00+02:00'),
};

describe('computeCompliance', () => {
  it('18 points en 5 catégories ; tout est fait : conforme, pas de prochaine action', () => {
    const report = computeCompliance(complete);
    expect(report.total).toBe(18);
    expect(report.categories.map(({ id, total }) => [id, total])).toEqual([
      ['mentions', 4],
      ['rgpd', 4],
      ['accessibilite', 4],
      ['actes', 3],
      ['cookies', 3],
    ]);
    expect(report).toMatchObject({ done: 18, score: 100, level: 'conforme', next: null });
  });

  it('points à faire : libellé précis, écran à compléter, prochaine action la plus urgente', () => {
    const report = computeCompliance({
      ...complete,
      site: { ...complete.site, accessibilite: { accessibility_level: 'conforme' }, mentions_legales: { ...complete.site.mentions_legales, credits: doc('') } },
      imagesWithoutAlt: 7,
    });
    expect(report.done).toBe(14);
    expect(report.score).toBe(78);
    expect(report.level).toBe('partiellement-conforme');
    const images = report.points.find((point) => point.id === 'accessibilite-images')!;
    expect(images).toMatchObject({ done: false, label: '7 images sans texte alternatif', todo: 'Décrire 7 images de la médiathèque', target: { to: '/mediatheque', search: { alt: true } } });
    expect(report.next?.id).toBe('accessibilite-images');
    expect(report.categories.find((category) => category.id === 'accessibilite')).toMatchObject({ done: 1, total: 4 });
  });

  it('une demande RGPD sans réponse après un mois passe avant tout le reste', () => {
    const report = computeCompliance({
      ...complete,
      site: { ...complete.site, mentions_legales: {} },
      openRgpdRequests: ['2026-08-20T09:00:00Z', '2026-09-20T09:00:00Z'],
    });
    const delay = report.points.find((point) => point.id === 'rgpd-delai')!;
    expect(delay).toMatchObject({ label: '1 demande RGPD sans réponse après un mois', todo: 'Répondre à la demande RGPD en retard' });
    expect(report.next?.id).toBe('rgpd-delai');
  });

  it("délibérations de l'année ; budget primitif de l'année passée accepté avant le 15 avril", () => {
    const documents = [
      { document_type: 'pv-conseil-municipal', year: 2025 },
      { document_type: 'deliberation', document_date: '2025-12-12' },
      { document_type: 'budget-primitif', year: 2025 },
    ];
    const march = computeCompliance({ ...complete, documents, now: new Date('2026-03-20T10:00:00Z') });
    expect(march.points.find((point) => point.id === 'actes-budget')!.done).toBe(true);
    expect(march.points.find((point) => point.id === 'actes-deliberations')!).toMatchObject({ done: false, todo: 'Publier les délibérations de 2026' });
    const may = computeCompliance({ ...complete, documents, now: new Date('2026-05-02T10:00:00Z') });
    expect(may.points.find((point) => point.id === 'actes-budget')!).toMatchObject({ done: false, todo: 'Publier le budget primitif 2026' });
  });

  it("éditeur : l'adresse de la mairie manque d'abord, puis le SIRET", () => {
    const editor = (site: ComplianceInput['site']) =>
      computeCompliance({ ...complete, site }).points.find((point) => point.id === 'mentions-editeur')!;
    expect(editor({ ...complete.site, address: '' })).toMatchObject({
      done: false,
      todo: "Indiquer l'adresse de la mairie",
      target: { to: '/mon-site/informations' },
    });
    expect(editor({ ...complete.site, mentions_legales: {} })).toMatchObject({
      done: false,
      todo: 'Indiquer le SIRET de la commune',
      target: { to: '/mon-site/legal', adminOnly: true },
    });
  });

  it('points assurés par la plateforme : cookies toujours faits, sans écran', () => {
    const cookies = computeCompliance(complete).points.filter((point) => point.category === 'cookies');
    expect(cookies.every((point) => point.done && point.platform && !point.target)).toBe(true);
  });
});

describe('hasText', () => {
  it('texte riche vide ou blanc : non ; texte : oui', () => {
    expect(hasText(null)).toBe(false);
    expect(hasText(doc(''))).toBe(false);
    expect(hasText(doc('   '))).toBe(false);
    expect(hasText(doc('Bonjour'))).toBe(true);
    expect(hasText('Texte')).toBe(true);
  });
});
