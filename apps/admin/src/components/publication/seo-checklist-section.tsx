/**
 * Être bien trouvé (#336) : les trois liens vers le site officiel que seule la mairie peut mettre à
 * jour. L'Annuaire et Wikipédia sont vérifiés automatiquement ; la fiche Google est cochée par la
 * commune. Visible une fois le site publié (administrateurs).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import type { SeoChecklistItem } from '@communeo/core';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { declareSeoStep, seoChecklistQuery } from '@/lib/seo';

const STATES = {
  verified: { tone: 'success' as const, label: 'Fait' },
  declared: { tone: 'info' as const, label: 'Fait, vérification en attente' },
  todo: { tone: 'warning' as const, label: 'À faire' },
};

function Step({ item, index, onDeclare, busy }: { item: SeoChecklistItem; index: number; onDeclare: (done: boolean) => void; busy: boolean }) {
  const state = item.checkable ? item.state : item.state === 'declared' ? 'verified' : item.state;
  const badge = STATES[state];
  const done = item.state !== 'todo';
  const titleId = `referencement-${item.id}`;
  return (
    <li className="space-y-2 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={titleId} className="text-base font-semibold">
          {index + 1}. {item.title}
        </h3>
        <StatusBadge tone={badge.tone} icon={state === 'verified' ? <CircleCheck aria-hidden="true" className="size-3.5" /> : undefined}>
          {badge.label}
        </StatusBadge>
      </div>
      <p className="text-[13px] text-secondary">{item.why}</p>
      {item.state !== 'verified' && (
        <ol className="list-decimal space-y-1 pl-5 text-[14px]">
          {item.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
      {item.detail && <p className="text-[13px] font-medium">{item.detail}</p>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {item.links.map((link) => (
          <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-brand underline">
            {link.label}
            <ExternalLink aria-hidden="true" className="size-3.5" />
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
        ))}
        {item.state !== 'verified' && (
          <Button type="button" size="sm" variant="secondary" disabled={busy} aria-describedby={titleId} onClick={() => onDeclare(!done)}>
            {busy && <Loader2 aria-hidden="true" className="animate-spin" />}
            {done ? 'Pas encore fait' : 'C’est fait'}
          </Button>
        )}
      </div>
    </li>
  );
}

export function SeoChecklistSection() {
  const client = useQueryClient();
  const [refresh, setRefresh] = useState(false);
  const checklist = useQuery(seoChecklistQuery(refresh));
  const [busy, setBusy] = useState<string | null>(null);
  if (!checklist.data) return null;
  const { items, siteUrl } = checklist.data;
  const remaining = items.filter((item) => item.state === 'todo').length;

  const declare = async (item: SeoChecklistItem, done: boolean) => {
    setBusy(item.id);
    try {
      const next = await declareSeoStep(item.id, done);
      client.setQueryData(seoChecklistQuery(refresh).queryKey, next);
      toast.success(done ? `« ${item.title} » noté comme fait.` : `« ${item.title} » remis à faire.`);
    } catch (error) {
      toast.error(`Non enregistré : ${error instanceof ApiError ? error.message : 'erreur inattendue'}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="referencement-titre" className="rounded-xl border border-border bg-surface dark:bg-sidebar">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
        <div>
          <h2 id="referencement-titre" className="text-lg">
            Être bien trouvé sur Internet
          </h2>
          <p className="mt-1 text-[13px] text-secondary">
            Indiquez l’adresse <strong className="font-semibold text-text">{siteUrl}</strong> là où les habitants la cherchent.{' '}
            {remaining ? `${remaining} démarche${remaining > 1 ? 's' : ''} à faire.` : 'Tout est fait.'}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="tertiary"
          disabled={checklist.isFetching}
          onClick={() => {
            setRefresh(true);
            void client.invalidateQueries({ queryKey: ['referencement'] });
          }}
        >
          <RefreshCw aria-hidden="true" className={checklist.isFetching ? 'animate-spin' : undefined} />
          Vérifier à nouveau
        </Button>
      </div>
      <ul className="divide-y divide-border">
        {items.map((item, index) => (
          <Step key={item.id} item={item} index={index} busy={busy === item.id} onDeclare={(done) => void declare(item, done)} />
        ))}
      </ul>
    </section>
  );
}
