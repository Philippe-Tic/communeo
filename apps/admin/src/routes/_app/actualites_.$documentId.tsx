import { createFileRoute } from '@tanstack/react-router';
import { ARTICLE_EDITOR } from '@/components/editor/article-editor';
import { EditorRoute } from '@/components/editor/editor-route';

export const Route = createFileRoute('/_app/actualites_/$documentId')({
  component: function Editor() {
    const { documentId } = Route.useParams();
    return <EditorRoute config={ARTICLE_EDITOR} documentId={documentId} />;
  },
});
