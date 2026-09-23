import { createFileRoute } from '@tanstack/react-router';
import { WasteScreen } from '@/components/waste/waste-screen';

export const Route = createFileRoute('/_app/dechets')({ component: WasteScreen });
