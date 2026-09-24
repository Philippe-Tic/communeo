import { createFileRoute } from '@tanstack/react-router';
import { ComplianceScreen } from '@/components/compliance/compliance-screen';

export const Route = createFileRoute('/_app/conformite')({ component: ComplianceScreen });
