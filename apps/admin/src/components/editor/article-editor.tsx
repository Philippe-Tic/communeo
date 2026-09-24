/**
 * Éditeur d'une actualité (parcours A) : titre, catégorie, à la une, chapô, image, adresse, date de
 * publication affichée, auteur ; contenu en blocs ; référencement.
 */
import { z } from 'zod';
import { ARTICLE_CATEGORY_LABELS } from '@communeo/core';
import { blocksSchema, BlockEditor, type Block } from '@/components/blocks';
import { DateField, FormSection, SelectField, SwitchField, TextareaField, TextField } from '@/components/form';
import { ImageField } from '@/components/media/media-fields';
import { BLOCKS, documentApi, optional, toApiValue, type BaseDocument } from '@/lib/content-api';
import { dateToParis, parisToDate } from '@/lib/dates';
import { imageSchema, type LibraryFile } from '@/lib/media-library';
import { displayName } from '@/lib/session';
import type { EditorBodyProps, EditorConfig } from './content-editor';
import { slugSchema, titleSchema } from './page-editor';

export type ArticleCategory = keyof typeof ARTICLE_CATEGORY_LABELS;
export const ARTICLE_CATEGORIES = Object.entries(ARTICLE_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

export interface ArticleDocument extends BaseDocument {
  summary: string | null;
  category: ArticleCategory | null;
  featured: boolean | null;
  publication_date: string | null;
  author: string | null;
  meta_description: string | null;
  image?: LibraryFile | null;
}

export type ArticleValues = {
  title: string;
  slug: string;
  summary: string;
  image: LibraryFile | null;
  category: string;
  featured: boolean;
  /** Jour affiché ; l'heure d'origine est gardée pour l'ordre des actualités du même jour */
  publication_day: string;
  publication_time: string;
  author: string;
  meta_description: string;
  blocks: Block[];
};

const publishSchema = z.object({
  title: titleSchema,
  slug: slugSchema,
  summary: z.string().max(300, 'Le chapô ne doit pas dépasser 300 caractères'),
  image: imageSchema,
  category: z.enum(Object.keys(ARTICLE_CATEGORY_LABELS) as [ArticleCategory, ...ArticleCategory[]], 'Choisissez une catégorie'),
  featured: z.boolean(),
  publication_day: z.string(),
  publication_time: z.string(),
  author: z.string().max(100, "L'auteur ne doit pas dépasser 100 caractères"),
  meta_description: z.string().max(160, 'La description ne doit pas dépasser 160 caractères'),
  blocks: blocksSchema('publish'),
});

export const articlesApi = documentApi<ArticleDocument, ArticleValues>('articles', (values) => ({
  title: values.title.trim(),
  ...(values.slug.trim() ? { slug: values.slug.trim() } : {}),
  summary: optional(values.summary),
  image: values.image?.id ?? null,
  ...(values.category ? { category: values.category } : {}),
  featured: values.featured,
  // Vide : la date de la première publication est posée par le backend
  publication_date: values.publication_day ? parisToDate(values.publication_day, values.publication_time || '12:00').toISOString() : null,
  author: optional(values.author),
  meta_description: optional(values.meta_description),
  blocks: toApiValue(values.blocks),
}), { populate: `${BLOCKS}&populate[image]=true` });

function ArticleBody({ slugField }: EditorBodyProps<ArticleDocument>) {
  return (
    <>
      <FormSection title="L'actualité" fields={['title', 'category', 'featured', 'summary', 'image', 'slug', 'publication_day', 'author']}>
        <TextField name="title" label="Titre" required inputProps={{ className: 'h-12 text-lg font-semibold md:h-11' }} />
        <div className="grid items-end gap-5 sm:grid-cols-2">
          <SelectField name="category" label="Catégorie" required placeholder="Choisir une catégorie" options={ARTICLE_CATEGORIES} />
          <div className="sm:pb-2.5">
            <SwitchField name="featured" label="Mettre à la une sur la page d'accueil" />
          </div>
        </div>
        <TextareaField name="summary" label="Chapô" rows={2} help="Une ou deux phrases, reprises dans la liste des actualités et sur l'accueil." />
        <ImageField name="image" label="Image" folder="Actualités" />
        {slugField}
        <div className="grid gap-5 sm:grid-cols-2">
          <DateField name="publication_day" label="Date de publication affichée" help="Vide : la date de la première publication." />
          <TextField name="author" label="Auteur" help="Personne ou service qui signe l'actualité." />
        </div>
      </FormSection>

      <BlockEditor name="blocks" heading="Contenu de l'actualité" emptyTitle="Cette actualité est vide. Ajoutez un premier bloc." />

      <details className="rounded-xl border border-border bg-surface p-5 dark:bg-sidebar">
        <summary className="cursor-pointer font-semibold">Référencement</summary>
        <div className="mt-4">
          <TextareaField name="meta_description" label="Description pour les moteurs de recherche" rows={2} help="160 caractères au plus. Par défaut, le chapô est utilisé." />
        </div>
      </details>
    </>
  );
}

export const ARTICLE_EDITOR: EditorConfig<ArticleDocument, ArticleValues> = {
  api: articlesApi,
  previewType: 'article',
  section: { label: 'Actualités', to: '/actualites', back: 'Retour aux actualités' },
  noun: { one: 'actualité', many: 'actualités', feminine: true, definite: "l'actualité" },
  schema: publishSchema as unknown as z.ZodType<ArticleValues, ArticleValues>,
  toValues: (doc, session) => {
    const published = doc?.publication_date ? dateToParis(new Date(doc.publication_date)) : null;
    return {
      title: doc?.title ?? '',
      slug: doc?.slug ?? '',
      summary: doc?.summary ?? '',
      image: doc?.image ?? null,
      category: doc?.category ?? '',
      featured: doc?.featured ?? false,
      publication_day: published?.day ?? '',
      publication_time: published?.time ?? '',
      // Nouvelle actualité : signée par la personne connectée, modifiable
      author: doc ? (doc.author ?? '') : session ? displayName(session) : '',
      meta_description: doc?.meta_description ?? '',
      blocks: doc?.blocks ?? [],
    };
  },
  fromServer: (doc) => {
    const published = doc.publication_date ? dateToParis(new Date(doc.publication_date)) : null;
    return { publication_day: published?.day ?? '', publication_time: published?.time ?? '' };
  },
  publicPath: (slug) => `/actualites/${slug}`,
  layout: 'preview',
  Body: ArticleBody,
};
