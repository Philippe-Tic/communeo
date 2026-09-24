import { createFileRoute } from '@tanstack/react-router';
import { StatisticsScreen } from '@/components/equipe/statistics-screen';

export const Route = createFileRoute('/plateforme/statistiques')({ component: StatisticsScreen });
