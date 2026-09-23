import { createFileRoute } from '@tanstack/react-router';
import { DOCUMENT_EDITOR } from '@/components/editor/document-editor';
import { EditorRoute } from '@/components/editor/editor-route';

export const Route = createFileRoute('/_app/documents_/$documentId')({
  component: function Editor() {
    const { documentId } = Route.useParams();
    return <EditorRoute config={DOCUMENT_EDITOR} documentId={documentId} />;
  },
});
