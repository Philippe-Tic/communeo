/**
 * Liste des documents officiels (handoff 6.13) : onglets par année (comptes serveur, l'année la plus
 * récente ouverte), liste compacte de 50 par défaut, référence, date, fichier (« PDF · 310 Ko »),
 * filtre par type. Tient avec plusieurs centaines de documents : rien n'est chargé en entier.
 */
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { documentsApi, DOCUMENT_TYPE_OPTIONS } from '@/components/editor/document-editor';
import { api } from '@/lib/api';
import { describeFile, type UploadedFile } from '@/lib/media';
import type { ContentListConfig, ListRow, TabOption } from './types';

export interface DocumentRow extends ListRow {
  slug: string;
  reference_number: string | null;
  document_date: string | null;
  year: number | null;
  file: Pick<UploadedFile, 'ext' | 'size'> | null;
}

/** Années affichées en onglets ; les plus anciennes sont regroupées */
const RECENT_YEARS = 4;

export const yearsQuery = {
  queryKey: ['publication-years', 'official-documents'],
  queryFn: async () => (await api<{ data: Array<{ year: number; count: number }> }>('/api/publication/official-documents/years')).data,
};

function useYearTabs(): TabOption[] | undefined {
  const { data } = useQuery(yearsQuery);
  if (!data) return undefined;
  const recent = data.slice(0, RECENT_YEARS);
  const older = data.slice(RECENT_YEARS);
  return [
    ...recent.map(({ year, count }) => ({ value: String(year), label: String(year), count })),
    ...(older.length ? [{ value: 'anciens', label: 'Plus anciens', count: older.reduce((sum, entry) => sum + entry.count, 0) }] : []),
    { value: 'toutes', label: 'Toutes les années' },
  ];
}

const date = (value: string | null) => (value ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : null);

export const DOCUMENTS_LIST: ContentListConfig<DocumentRow> = {
  source: {
    type: 'official-documents',
    fields: ['title', 'slug', 'reference_number', 'document_date', 'year'],
    populate: { file: ['ext', 'size'] },
    searchField: 'title',
  },
  title: 'Documents officiels',
  noun: { one: 'document', many: 'documents', feminine: false, definite: 'le document' },
  newLabel: 'Nouveau document',
  editTo: '/documents/$documentId',
  rowIcon: () => <FileText aria-hidden="true" className="size-4 shrink-0 text-secondary" />,
  columns: [
    { id: 'reference', header: 'Référence', cell: (row) => row.reference_number, sortField: 'reference_number', sortLabel: 'référence', wideOnly: true, className: 'whitespace-nowrap' },
    { id: 'date', header: 'Date', cell: (row) => date(row.document_date), sortField: 'document_date', sortLabel: 'date du document', className: 'whitespace-nowrap' },
    { id: 'fichier', header: 'Fichier', cell: (row) => (row.file ? describeFile(row.file) : <span className="text-danger">Fichier manquant</span>), className: 'whitespace-nowrap' },
  ],
  meta: (row) => [row.reference_number, date(row.document_date), row.file ? describeFile(row.file) : null],
  defaultSort: { field: 'document_date', order: 'desc' },
  compactByDefault: true,
  tabs: {
    key: 'annee',
    label: 'Année',
    useOptions: useYearTabs,
    defaultValue: (options) => options[0]?.value ?? 'toutes',
    query: (value, options): Record<string, string> => {
      if (value === 'toutes') return {};
      if (value === 'anciens') {
        const oldestRecent = options.filter((option) => /^\d{4}$/.test(option.value)).at(-1)?.value;
        return oldestRecent ? { 'filters[year][$lt]': oldestRecent } : {};
      }
      return { 'filters[year][$eq]': value };
    },
  },
  filters: [{ key: 'type', label: 'Type', field: 'document_type', options: DOCUMENT_TYPE_OPTIONS }],
  empty: {
    title: 'Publiez votre premier document officiel',
    text: 'Délibérations, arrêtés, procès-verbaux, budgets : la loi impose de les rendre accessibles en ligne. Un titre, un type, une date et le fichier suffisent.',
  },
  publicPath: (row) => `/documents/${row.slug}`,
  duplicate: async (row, client) => {
    const draft = await client.fetchQuery(documentsApi.query(row.documentId));
    const copy = await documentsApi.saveDraft(null, {
      title: `${draft.title} (copie)`,
      slug: '',
      document_type: draft.document_type ?? '',
      reference_number: '',
      document_date: draft.document_date ?? '',
      session_date: draft.session_date ?? '',
      description: draft.description ?? '',
      file: null,
      additional_files: [],
    });
    return copy.documentId;
  },
};
