import { createFileRoute } from '@tanstack/react-router';
import { TeamBillingScreen } from '@/components/equipe/billing-screen';

export const Route = createFileRoute('/plateforme/facturation')({ component: TeamBillingScreen });
