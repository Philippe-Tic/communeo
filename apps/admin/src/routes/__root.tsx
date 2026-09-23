import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import { TooltipProvider } from '@/components/ui/tooltip';

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <TooltipProvider>
      <Outlet />
    </TooltipProvider>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1>Page introuvable</h1>
      <p className="mt-2 text-secondary">Cette adresse ne correspond à aucun écran de l'administration.</p>
      <Link to="/" className="mt-4 inline-block font-semibold text-brand underline">
        Retour au tableau de bord
      </Link>
    </main>
  ),
});
