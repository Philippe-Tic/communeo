import { describe, expect, it } from 'vitest';
import { listUrl, type ListParams, type ListSource } from './content-list';

const source: ListSource = { type: 'articles', fields: ['title', 'category'], media: ['image'], searchField: 'title' };
const params: ListParams = { q: '', filters: {}, sort: 'updatedAt', order: 'desc', page: 1, pageSize: 25 };
const query = (url: string | null) => new URLSearchParams(url!.split('?')[1]);

describe('listUrl', () => {
  it('brouillons (dernière version), champs, vignette, tri stable, page', () => {
    const search = query(listUrl(source, params, {}));
    expect(search.get('status')).toBe('draft');
    expect(search.getAll('fields[0]')).toEqual(['documentId']);
    expect(search.get('fields[3]')).toBe('title');
    expect(search.get('populate[image][fields][0]')).toBe('url');
    expect(search.get('sort[0]')).toBe('updatedAt:desc');
    expect(search.get('sort[1]')).toBe('documentId:asc');
    expect(search.get('pagination[pageSize]')).toBe('25');
  });

  it('recherche et filtres propres au type', () => {
    const search = query(
      listUrl(source, { ...params, q: ' déchetterie ', filters: { 'filters[category][$eq]': 'vie-pratique' } }, {}),
    );
    expect(search.get('filters[title][$containsi]')).toBe('déchetterie');
    expect(search.get('filters[category][$eq]')).toBe('vie-pratique');
  });

  it('statut : brouillons par identifiants, publiés en les excluant, rien à chercher sans brouillon', () => {
    const states = {
      a: { state: 'draft' as const, scheduledAt: null },
      b: { state: 'published' as const, scheduledAt: null },
    };
    const drafts = query(listUrl(source, { ...params, statut: 'brouillon' }, states));
    expect(drafts.get('filters[documentId][$in][0]')).toBe('a');
    expect(drafts.get('filters[scheduled_at][$null]')).toBe('true');
    expect(query(listUrl(source, { ...params, statut: 'publie' }, states)).get('filters[documentId][$notIn][0]')).toBe(
      'a',
    );
    expect(listUrl(source, { ...params, statut: 'brouillon' }, { b: states.b })).toBeNull();
    expect(
      query(listUrl(source, { ...params, statut: 'programme' }, states)).get('filters[scheduled_at][$notNull]'),
    ).toBe('true');
  });
});
