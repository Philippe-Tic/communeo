import { createFileRoute } from '@tanstack/react-router';
import { CommunesScreen } from '@/components/equipe/communes-screen';

export const Route = createFileRoute('/plateforme/')({ component: CommunesScreen });
