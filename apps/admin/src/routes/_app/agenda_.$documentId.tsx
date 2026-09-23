import { createFileRoute } from '@tanstack/react-router';
import { EVENT_EDITOR } from '@/components/editor/event-editor';
import { EditorRoute } from '@/components/editor/editor-route';

export const Route = createFileRoute('/_app/agenda_/$documentId')({
  component: function Editor() {
    const { documentId } = Route.useParams();
    return <EditorRoute config={EVENT_EDITOR} documentId={documentId} />;
  },
});
