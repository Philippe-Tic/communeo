import { createFileRoute } from '@tanstack/react-router';
import { AlertEditor } from '@/components/alerts/alert-editor';

export const Route = createFileRoute('/_app/alertes_/$documentId')({
  // « Réutiliser » une alerte passée : ?depuis=<documentId>
  validateSearch: (raw: Record<string, unknown>): { depuis?: string } =>
    typeof raw.depuis === 'string' && /^[\w-]{1,64}$/.test(raw.depuis) ? { depuis: raw.depuis } : {},
  component: function Editor() {
    const { documentId } = Route.useParams();
    const { depuis } = Route.useSearch();
    const isNew = documentId === 'nouvelle';
    return (
      <AlertEditor
        key={`${documentId}-${depuis ?? ''}`}
        documentId={isNew ? null : documentId}
        reuseId={isNew ? depuis : undefined}
      />
    );
  },
});
