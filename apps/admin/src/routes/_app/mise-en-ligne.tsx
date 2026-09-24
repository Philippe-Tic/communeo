import { createFileRoute } from '@tanstack/react-router';
import { PublicationScreen } from '@/components/publication/publication-screen';

export const Route = createFileRoute('/_app/mise-en-ligne')({ component: PublicationScreen });
