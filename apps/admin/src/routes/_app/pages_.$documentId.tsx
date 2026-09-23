/**
 * Éditeur d'une page : /pages/nouvelle (création au premier enregistrement) ou /pages/<documentId>.
 */
import { createFileRoute } from '@tanstack/react-router';
import { EditorRoute } from '@/components/editor/editor-route';
import { PAGE_EDITOR } from '@/components/editor/page-editor';

export const Route = createFileRoute('/_app/pages_/$documentId')({
  component: function PageEditorRoute() {
    const { documentId } = Route.useParams();
    return <EditorRoute config={PAGE_EDITOR} documentId={documentId} />;
  },
});
