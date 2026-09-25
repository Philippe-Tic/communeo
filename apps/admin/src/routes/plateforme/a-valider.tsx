import { createFileRoute } from '@tanstack/react-router';
import { ValidationsScreen } from '@/components/equipe/validations-screen';

export const Route = createFileRoute('/plateforme/a-valider')({ component: ValidationsScreen });
