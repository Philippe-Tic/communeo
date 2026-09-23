import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import { CanteenScreen, type CanteenSearch } from '@/components/canteen/canteen-screen';
import { currentMonday, isMonday } from '@/lib/canteen';

export const Route = createFileRoute('/_app/cantine')({
  // ?semaine=AAAA-MM-JJ (un lundi) &ecole=Nom
  validateSearch: (raw: Record<string, unknown>): CanteenSearch => ({
    ...(typeof raw.semaine === 'string' && isMonday(raw.semaine) ? { semaine: raw.semaine } : {}),
    ...(typeof raw.ecole === 'string' && raw.ecole.trim() && raw.ecole.length <= 100 ? { ecole: raw.ecole } : {}),
  }),
  component: function Canteen() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const onChange = useCallback(
      (patch: Partial<CanteenSearch>) => void navigate({ search: (previous) => ({ ...previous, ...patch }) }),
      [navigate],
    );
    return <CanteenScreen monday={search.semaine ?? currentMonday()} school={search.ecole ?? ''} onChange={onChange} />;
  },
});
