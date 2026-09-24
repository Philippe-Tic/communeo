import { createFileRoute } from '@tanstack/react-router';
import { CommuneScreen } from '@/components/equipe/commune-screen';

export const Route = createFileRoute('/plateforme/communes/$documentId')({ component: CommunePage });

function CommunePage() {
  const { documentId } = Route.useParams();
  return <CommuneScreen key={documentId} documentId={documentId} />;
}
