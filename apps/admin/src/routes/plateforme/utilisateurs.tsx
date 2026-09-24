import { createFileRoute } from '@tanstack/react-router';
import { PlatformUsersScreen } from '@/components/equipe/platform-users-screen';

export const Route = createFileRoute('/plateforme/utilisateurs')({ component: PlatformUsersScreen });
