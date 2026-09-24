/** Ancienne adresse du choix de la commune : l'espace de l'équipe Communeo l'a remplacée. */
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/communes')({
  beforeLoad: () => {
    throw redirect({ to: '/plateforme' });
  },
});
