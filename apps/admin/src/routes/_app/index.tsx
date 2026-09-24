import { createFileRoute } from '@tanstack/react-router';
import { DashboardScreen } from '@/components/dashboard/dashboard-screen';

export const Route = createFileRoute('/_app/')({ component: DashboardScreen });
