/**
 * Éditeur d'une page (handoff 6.3) : en-tête (titre, chapô, image, adresse, menu), blocs, référencement.
 */
import { Image as ImageIcon } from 'lucide-react';
import { z } from 'zod';
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from '@communeo/core';
import { blocksSchema, BlockEditor } from '@/components/blocks';
import { FormSection, TextareaField, TextField } from '@/components/form';
import { MenuSwitch } from '@/components/menu/menu-switch';
import { pagesApi, pageToValues, type PageDocument, type PageDraft, type PageValues } from '@/lib/content-api';
import { ContentEditor, type EditorBodyProps, type EditorConfig } from './content-editor';

export const slugSchema = z
  .string()
  .trim()
  .max(SLUG_MAX_LENGTH)
  .refine((value) => !value || SLUG_PATTERN.test(value), "L'adresse ne peut contenir que des lettres minuscules, des chiffres et des tirets");

export const titleSchema = z.string().trim().min(1, 'Le titre est obligatoire').max(200, 'Le titre ne doit pas dépasser 200 caractères');

/** L'image principale arrive avec la médiathèque (#142) */
export function ImagePlaceholder({ label }: { label: string }) {
  return (
    <div>
      <p className="font-medium">
        {label} <span className="font-normal text-secondary">(facultative)</span>
      </p>
      <p className="mt-1.5 flex items-center gap-2 rounded-lg border border-dashed border-border-input bg-sidebar p-3 text-[13px] text-secondary">
        <ImageIcon aria-hidden="true" className="size-4" />
        Le choix de l'image arrive avec la médiathèque.
      </p>
    </div>
  );
}

const publishSchema = z.object({
  title: titleSchema,
  slug: slugSchema,
  lead: z.string().max(300, 'Le chapô ne doit pas dépasser 300 caractères'),
  meta_description: z.string().max(160, 'La description ne doit pas dépasser 160 caractères'),
  blocks: blocksSchema('publish'),
});

function PageBody({ documentId, slugField }: EditorBodyProps<PageDocument>) {
  return (
    <>
      <FormSection title="En-tête" fields={['title', 'lead', 'slug']}>
        <TextField name="title" label="Titre" required inputProps={{ className: 'h-12 text-lg font-semibold md:h-11' }} />
        <TextareaField name="lead" label="Chapô" rows={2} help="Une ou deux phrases qui résument la page." />
        <ImagePlaceholder label="Image principale" />
        <div className="grid items-end gap-5 sm:grid-cols-[1fr_auto]">
          {slugField}
          <div className="sm:pb-7">
            <MenuSwitch pageDocumentId={documentId} />
          </div>
        </div>
      </FormSection>

      <BlockEditor name="blocks" />

      <details className="rounded-xl border border-border bg-surface p-5 dark:bg-sidebar">
        <summary className="cursor-pointer font-semibold">Référencement</summary>
        <div className="mt-4">
          <TextareaField name="meta_description" label="Description pour les moteurs de recherche" rows={2} help="160 caractères au plus. Par défaut, le chapô est utilisé." />
        </div>
      </details>
    </>
  );
}

export const PAGE_EDITOR: EditorConfig<PageDocument, PageValues> = {
  api: pagesApi,
  previewType: 'page',
  section: { label: 'Pages', to: '/pages', back: 'Retour aux pages' },
  noun: { one: 'page', many: 'pages', feminine: true, definite: 'la page' },
  schema: publishSchema as unknown as z.ZodType<PageValues, PageValues>,
  toValues: (doc) => pageToValues(doc),
  publicPath: (slug) => `/${slug}`,
  layout: 'preview',
  Body: PageBody,
};

export function PageEditor(props: { documentId: string | null; initial?: PageDraft; onCreated: (page: PageDraft) => void }) {
  return <ContentEditor config={PAGE_EDITOR} {...props} />;
}
