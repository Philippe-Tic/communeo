import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, type ReactNode } from 'react';
import { focusHeadingIfRequested } from '@/lib/focus';
import { sessionQuery } from '@/lib/session';

/** Titre de page (h1) et titre du document : « Actualités — Saint-Aubin-sur-Loire · Communeo » */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  const { data: user } = useQuery(sessionQuery);
  const siteName = user?.site?.name;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => focusHeadingIfRequested(heading.current), []);
  useEffect(() => {
    document.title = [title, siteName].filter(Boolean).join(' — ') + ' · Communeo';
  }, [title, siteName]);

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 ref={heading} className="outline-none">
          {title}
        </h1>
        {description && <p className="mt-1 text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Écran pas encore construit (phase 3 en cours) */
export function ComingSoon({ title, ticket }: { title: string; ticket: number }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="rounded-xl border border-border bg-surface p-8">
        <p>Cet écran arrive bientôt.</p>
        <p className="mt-1 text-[13px] text-secondary">Ticket #{ticket}</p>
      </div>
    </>
  );
}
