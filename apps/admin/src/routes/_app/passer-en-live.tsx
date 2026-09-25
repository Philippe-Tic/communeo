import { createFileRoute } from '@tanstack/react-router';
import { GoLiveScreen } from '@/components/trial/go-live-screen';

export const Route = createFileRoute('/_app/passer-en-live')({ component: GoLiveScreen });
