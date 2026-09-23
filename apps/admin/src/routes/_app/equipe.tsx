import { createFileRoute } from '@tanstack/react-router';
import { TeamScreen } from '@/components/team/team-screen';

export const Route = createFileRoute('/_app/equipe')({ component: TeamScreen });
