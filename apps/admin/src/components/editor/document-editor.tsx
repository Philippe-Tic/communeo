/**
 * Document officiel (handoff 6.13, formulaire) : titre, type, numéro de référence, date du document et
 * de séance, année calculée, description ; fichier principal obligatoire et annexes.
 */
import { useWatch } from 'react-hook-form';
import { z } from 'zod';
import { DOCUMENT_TYPE_LABELS } from '@communeo/core';
import { DateField, FileField, FormSection, SelectField, TextareaField, TextField } from '@/components/form';
import { documentApi, optional, type BaseDocument } from '@/lib/content-api';
import { DOCUMENT_TYPES, type UploadedFile } from '@/lib/media';
import { controlClass } from '@/components/form/field';
import { cn } from '@/lib/utils';
import type { EditorBodyProps, EditorConfig } from './content-editor';
import type { OutlineSection } from './form-outline';
import { slugSchema, titleSchema } from './page-editor';

export const DOCUMENT_TYPE_OPTIONS = Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }));

export interface OfficialDocument extends BaseDocument {
  document_type: string | null;
  reference_number: string | null;
  document_date: string | null;
  session_date: string | null;
  year: number | null;
  description: string | null;
  file: UploadedFile | null;
  additional_files: UploadedFile[] | null;
}

export type DocumentValues = {
  title: string;
  slug: string;
  document_type: string;
  reference_number: string;
  document_date: string;
  session_date: string;
  description: string;
  file: UploadedFile | null;
  additional_files: UploadedFile[];
};

const publishSchema = z.object({
  title: titleSchema,
  slug: slugSchema,
  document_type: z.string().min(1, 'Choisissez le type de document'),
  reference_number: z.string().max(60, 'La référence ne doit pas dépasser 60 caractères'),
  document_date: z.string().min(1, 'Indiquez la date du document'),
  session_date: z.string(),
  description: z.string().max(1000, 'La description ne doit pas dépasser 1 000 caractères'),
  file: z.custom<UploadedFile | null>().refine((file) => !!file, 'Joignez le fichier principal'),
  additional_files: z.array(z.custom<UploadedFile>()),
});

export const documentsApi = documentApi<OfficialDocument, DocumentValues>(
  'official-documents',
  (values) => ({
    title: values.title.trim(),
    ...(values.slug.trim() ? { slug: values.slug.trim() } : {}),
    ...(values.document_type ? { document_type: values.document_type } : {}),
    reference_number: optional(values.reference_number),
    document_date: values.document_date || null,
    session_date: values.session_date || null,
    // Année calculée depuis la date du document (onglets de la liste, pages du site)
    year: values.document_date ? Number(values.document_date.slice(0, 4)) : null,
    description: optional(values.description),
    file: values.file?.id ?? null,
    additional_files: values.additional_files.map((file) => file.id),
  }),
  { populate: 'populate[file]=true&populate[additional_files]=true' },
);

const OUTLINE: OutlineSection[] = [
  { id: 'section-document', title: 'Le document', fields: ['title', 'document_type', 'reference_number', 'document_date', 'session_date', 'description', 'slug'] },
  { id: 'section-fichiers', title: 'Fichiers', fields: ['file', 'additional_files'] },
];

function Year() {
  const date = useWatch<DocumentValues, 'document_date'>({ name: 'document_date' });
  return (
    <div>
      <label htmlFor="annee-calculee" className="font-medium">
        Année
      </label>
      <input id="annee-calculee" disabled value={date ? date.slice(0, 4) : ''} aria-describedby="annee-calculee-aide" className={cn(controlClass, 'mt-1.5 h-11 md:h-10')} />
      <p id="annee-calculee-aide" className="mt-1.5 text-[13px] text-secondary">
        Calculée depuis la date du document.
      </p>
    </div>
  );
}

function DocumentBody({ slugField }: EditorBodyProps<OfficialDocument>) {
  return (
    <>
      <FormSection id="section-document" title="Le document" fields={OUTLINE[0]!.fields}>
        <TextField name="title" label="Titre" required inputProps={{ className: 'h-12 text-lg font-semibold md:h-11' }} />
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField name="document_type" label="Type" required placeholder="Choisir un type" options={DOCUMENT_TYPE_OPTIONS} />
          <TextField name="reference_number" label="Numéro de référence" help="Par exemple DEL-2026-042." />
          <DateField name="document_date" label="Date du document" required />
          <DateField name="session_date" label="Date de séance" help="Pour une délibération ou un procès-verbal." />
        </div>
        <Year />
        <TextareaField name="description" label="Description" rows={3} />
        {slugField}
      </FormSection>

      <FormSection id="section-fichiers" title="Fichiers" fields={OUTLINE[1]!.fields}>
        <FileField name="file" label="Fichier principal" required types={DOCUMENT_TYPES} help="PDF de préférence ; Word, Excel ou OpenDocument acceptés. 20 Mo au maximum." />
        <FileField name="additional_files" label="Annexes" multiple addLabel="Ajouter une annexe" types={DOCUMENT_TYPES} />
      </FormSection>
    </>
  );
}

export const DOCUMENT_EDITOR: EditorConfig<OfficialDocument, DocumentValues> = {
  api: documentsApi,
  previewType: 'official-document',
  section: { label: 'Documents officiels', to: '/documents', back: 'Retour aux documents officiels' },
  noun: { one: 'document', many: 'documents', feminine: false, definite: 'le document' },
  schema: publishSchema as unknown as z.ZodType<DocumentValues, DocumentValues>,
  toValues: (doc) => ({
    title: doc?.title ?? '',
    slug: doc?.slug ?? '',
    document_type: doc?.document_type ?? '',
    reference_number: doc?.reference_number ?? '',
    document_date: doc?.document_date ?? '',
    session_date: doc?.session_date ?? '',
    description: doc?.description ?? '',
    file: doc?.file ?? null,
    additional_files: doc?.additional_files ?? [],
  }),
  publicPath: (slug) => `/documents/${slug}`,
  layout: 'outline',
  outline: OUTLINE,
  Body: DocumentBody,
};
