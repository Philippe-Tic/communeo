/**
 * Liste des actualités (gabarit #134) : catégorie, auteur, filtre par catégorie.
 */
import { ARTICLE_CATEGORY_LABELS } from '@communeo/core';
import { articlesApi, ARTICLE_CATEGORIES, type ArticleCategory } from '@/components/editor/article-editor';
import { formatListDate } from '@/lib/dates';
import type { ContentListConfig, ListRow, Media } from './types';

export interface ArticleRow extends ListRow {
  slug: string;
  category: ArticleCategory | null;
  author: string | null;
  publication_date: string | null;
  image: Media | null;
}

const categoryLabel = (row: ArticleRow) => (row.category ? ARTICLE_CATEGORY_LABELS[row.category] : null);

export const ARTICLES_LIST: ContentListConfig<ArticleRow> = {
  source: { type: 'articles', fields: ['title', 'slug', 'category', 'author', 'publication_date'], media: ['image'], searchField: 'title' },
  title: 'Actualités',
  noun: { one: 'actualité', many: 'actualités', feminine: true, definite: "l'actualité" },
  newLabel: 'Nouvelle actualité',
  editTo: '/actualites/$documentId',
  thumbnail: (row) => row.image,
  columns: [
    { id: 'categorie', header: 'Catégorie', cell: (row) => categoryLabel(row) },
    { id: 'date', header: 'Date', cell: (row) => (row.publication_date ? formatListDate(new Date(row.publication_date)) : <span className="text-secondary">—</span>), sortField: 'publication_date', sortLabel: 'date de publication', wideOnly: true },
    { id: 'auteur', header: 'Auteur', cell: (row) => row.author, wideOnly: true },
  ],
  meta: (row) => [categoryLabel(row), row.author],
  filters: [{ key: 'categorie', label: 'Catégorie', field: 'category', options: ARTICLE_CATEGORIES }],
  empty: {
    title: 'Publiez votre première actualité',
    text: "Une actualité apparaît sur la page d'accueil du site et dans la rubrique Actualités. Un titre, quelques lignes et une image suffisent.",
  },
  publicPath: (row) => `/actualites/${row.slug}`,
  duplicate: async (row, client) => {
    const draft = await client.fetchQuery(articlesApi.query(row.documentId));
    const copy = await articlesApi.saveDraft(null, {
      title: `${draft.title} (copie)`,
      slug: '',
      summary: draft.summary ?? '',
      image: draft.image ?? null,
      category: draft.category ?? 'vie-municipale',
      featured: false,
      publication_day: '',
      publication_time: '',
      author: draft.author ?? '',
      meta_description: draft.meta_description ?? '',
      blocks: draft.blocks ?? [],
    });
    return copy.documentId;
  },
};
