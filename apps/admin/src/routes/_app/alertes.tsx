import { createFileRoute } from '@tanstack/react-router';
import { AlertsScreen } from '@/components/alerts/alerts-screen';

export const Route = createFileRoute('/_app/alertes')({ component: AlertsScreen });
