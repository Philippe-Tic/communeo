/**
 * Écrans réservés aux administrateurs (handoff 6.5 « Droits insuffisants ») : un éditeur qui ouvre
 * l'adresse directement voit qui contacter, au lieu d'un écran vide ou d'erreurs de l'API.
 */
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { focusHeadingIfRequested } from '@/lib/focus';
import { sessionQuery } from '@/lib/session';
import { DialogIcon } from './ui/confirm-dialog';
import { ShieldAlert } from 'lucide-react';

const listFormatter = new Intl.ListFormat('fr', { type: 'disjunction' });

export function AdminOnly({ subject, children }: { subject: string; children: ReactNode }) {
  const { data: user } = useSuspenseQuery(sessionQuery);
  if (user.municipality_role === 'admin' || user.municipality_role === 'super_admin') return children;
  return <NotAllowed subject={subject} />;
}

function NotAllowed({ subject }: { subject: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const { data: admins } = useQuery({
    queryKey: ['administrateurs'],
    queryFn: () => api<{ data: { name: string }[] }>('/api/user-management/admins'),
    select: (response) => response.data.map((admin) => admin.name),
  });
  useEffect(() => focusHeadingIfRequested(heading.current), []);
  useEffect(() => {
    document.title = 'Page réservée aux administrateurs · Communeo';
  }, []);

  return (
    <div className="mx-auto mt-6 max-w-[520px] rounded-xl border border-border bg-surface p-6 md:mt-12 md:p-8">
      <DialogIcon tone="warning" icon={ShieldAlert} />
      <h1 ref={heading} className="mt-4 text-[22px] outline-none">
        Cette page est réservée aux administrateurs
      </h1>
      <p className="mt-2 text-secondary">
        {subject} n'est pas accessible avec votre rôle d'éditeur.{' '}
        {admins && admins.length > 0 ? `Demandez à ${listFormatter.format(admins)}.` : 'Demandez à un administrateur de votre commune.'}
      </p>
      <Link to="/" className="mt-5 inline-block font-semibold text-brand underline underline-offset-2">
        Retour au tableau de bord
      </Link>
    </div>
  );
}
