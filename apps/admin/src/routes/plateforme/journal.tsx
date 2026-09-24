import { createFileRoute } from '@tanstack/react-router';
import { PlatformJournalScreen } from '@/components/equipe/platform-journal-screen';

export const Route = createFileRoute('/plateforme/journal')({ component: PlatformJournalScreen });
