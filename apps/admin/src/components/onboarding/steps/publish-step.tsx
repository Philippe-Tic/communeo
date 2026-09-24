/**
 * Étape 7 — Mise en ligne (#154, handoff 6.18 « Étape 7 Récapitulatif » et « Succès ») : ce qui
 * va être mis en ligne, à l'adresse provisoire ; la mise en ligne est suivie sur place (étapes du
 * worker), puis l'écran de succès donne le lien du site et les trois premiers points de la checklist
 * « Pour terminer votre site », reprise par le tableau de bord. L'assistant est terminé au succès.
 */
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Check, CloudUpload, ExternalLink, Info, Loader2, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { THEMES } from '@communeo/core';
import { PUBLICATION_STEPS } from '@/components/publication/publication-screen';
import { ApiError, api } from '@/lib/api';
import { publicationStatesQuery } from '@/lib/content-list';
import { checklistQuery } from '@/lib/onboarding';
import { pageTemplatesQuery } from '@/lib/page-templates';
import { publicationQuery } from '@/lib/publication';
import { sessionQuery } from '@/lib/session';
import { WizardActions, type StepProps } from '../onboarding-screen';
import { WizardFrame } from '../wizard-frame';
import { StepHeading } from './step-heading';

const COMMON_PAGES = 'Accueil, Contact, Mentions légales, Données personnelles, Accessibilité';
const host = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');
const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;

function Success({ siteName, liveUrl, seconds }: { siteName: string; liveUrl: string | null; seconds: number | null }) {
  const checklist = useQuery(checklistQuery);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    document.title = 'Site en ligne · Communeo';
  }, []);
  const todo = checklist.data?.todo.slice(0, 3) ?? [];
  return (
    <WizardFrame step={null} actions={null}>
      <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4 py-6 text-center md:py-10">
        <span
          aria-hidden="true"
          className="grid size-[72px] place-items-center rounded-full bg-success-bg text-success"
        >
          <Check className="size-9" />
        </span>
        <h1 ref={heading} tabIndex={-1} className="text-[28px] leading-tight outline-none">
          Le site de {siteName} est en ligne
        </h1>
        <p className="text-[16px] text-secondary">
          {seconds ? `Mise en ligne réussie en ${plural(seconds, 'seconde', 'secondes')}.` : 'Mise en ligne réussie.'}
        </p>
        {liveUrl && (
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg bg-brand-button px-5 text-[16px] font-semibold break-all text-on-brand hover:bg-brand-hover"
          >
            Voir {host(liveUrl)}
            <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
            <span className="sr-only">(nouvel onglet)</span>
          </a>
        )}
        <Link to="/" className="font-semibold text-brand underline underline-offset-2 hover:text-brand-hover">
          Aller au tableau de bord
        </Link>
        {todo.length > 0 && (
          <section
            aria-labelledby="pour-finir"
            className="mt-2 w-full rounded-xl border border-border bg-surface p-4 text-left dark:bg-sidebar"
          >
            <h2 id="pour-finir" className="text-[15px] font-semibold">
              Pour finir votre site <span className="font-normal text-secondary">(visible sur le tableau de bord)</span>
            </h2>
            <ul className="mt-2 space-y-2">
              {todo.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-secondary">
                  <span aria-hidden="true" className="mt-0.5 size-4 shrink-0 rounded-full border border-border-input" />
                  {item.todo}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </WizardFrame>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6">
      <dt className="text-secondary">{label}</dt>
      <dd className="font-semibold break-words">{children}</dd>
    </div>
  );
}

type Phase =
  | { kind: 'recap' }
  | { kind: 'running'; since: number }
  | { kind: 'failed'; message: string }
  | { kind: 'done'; seconds: number | null };

export function PublishStep({ site, step, back, later, complete, alert }: StepProps & { alert: ReactNode }) {
  const client = useQueryClient();
  const { data: user } = useSuspenseQuery(sessionQuery);
  const templates = useQuery(pageTemplatesQuery);
  const pageStates = useQuery(publicationStatesQuery('pages'));
  const [phase, setPhase] = useState<Phase>({ kind: 'recap' });
  // Suivie même dans un onglet en arrière-plan : on attend souvent la fin ailleurs
  const status = useQuery({
    ...publicationQuery,
    enabled: phase.kind === 'running',
    refetchIntervalInBackground: true,
  });
  const liveUrl = user.site?.live_url ?? null;

  const trigger = useMutation({
    mutationFn: () => api<{ status: string }>('/api/deployment/trigger', { method: 'POST' }),
    onSuccess: () => {
      client.setQueryData(publicationQuery.queryKey, (current) =>
        current ? { ...current, state: 'running' as const, step: 'queued' as const } : current,
      );
      setPhase({ kind: 'running', since: Date.now() });
      void client.invalidateQueries({ queryKey: publicationQuery.queryKey });
    },
    onError: (error) =>
      setPhase({
        kind: 'failed',
        message: `La mise en ligne n'a pas pu être demandée : ${error instanceof ApiError ? error.message : 'le serveur ne répond pas'}.`,
      }),
  });

  // Fin de la mise en ligne : état relu après la demande, qui n'est plus « en cours »
  const data = status.data;
  const finished = phase.kind === 'running' && !!data && status.dataUpdatedAt > phase.since && data.state !== 'running';
  const succeeded = finished && data?.lastDeployment?.status === 'ready';
  const buildFailed = finished && !succeeded;
  const handled = useRef(0);
  useEffect(() => {
    if (!succeeded || phase.kind !== 'running' || handled.current === phase.since) return;
    handled.current = phase.since;
    const seconds = data?.lastDeployment?.buildTime ?? null;
    // L'assistant est terminé, puis l'écran de succès s'affiche
    void complete().then(() => {
      void client.invalidateQueries({ queryKey: checklistQuery.queryKey });
      setPhase({ kind: 'done', seconds });
    });
  }, [succeeded, data, phase, complete, client]);

  if (phase.kind === 'done') return <Success siteName={site.name} liveUrl={liveUrl} seconds={phase.seconds} />;

  const running = trigger.isPending || (phase.kind === 'running' && !buildFailed);
  const error =
    phase.kind === 'failed'
      ? phase.message
      : buildFailed
        ? `La mise en ligne a échoué${data?.reference ? ` (référence ${data.reference})` : ''}. Rien n'a été perdu : réessayez, ou contactez l'équipe Communeo avec cette référence.`
        : null;
  // Pages créées depuis les modèles, jamais publiées
  const drafts = (templates.data ?? []).filter(
    (template) => template.page && (pageStates.data?.[template.page.documentId]?.state ?? 'draft') === 'draft',
  ).length;
  const missingLegal = [site.mentions_legales?.siret, site.mentions_legales?.publication_director].filter(
    (value) => !value?.trim(),
  ).length;
  const theme = THEMES.find((entry) => entry.id === site.theme);
  // Nombre, parfois reçu en texte
  const population = Number(site.infos_pratiques?.population) || null;
  const currentStep = PUBLICATION_STEPS.find((entry) => entry.id === data?.step);

  return (
    <WizardFrame
      step={step}
      actions={
        <WizardActions
          onBack={running ? undefined : back}
          tertiary={running ? undefined : { label: 'Enregistrer et continuer plus tard', onClick: () => void later() }}
          primary={{
            label: running ? 'Mise en ligne…' : error ? 'Réessayer' : 'Mettre le site en ligne',
            icon: running ? undefined : CloudUpload,
            busy: running,
            onClick: () => trigger.mutate(),
          }}
        />
      }
    >
      {alert}
      {error && (
        <p role="alert" className="mb-5 flex gap-2 rounded-xl border border-danger bg-danger-alert-bg p-4">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
          {error}
        </p>
      )}
      <StepHeading step={step}>Mise en ligne</StepHeading>
      <p className="mt-2 text-secondary">
        Votre site sera accessible à l'adresse provisoire ci-dessous. Vous pourrez ajouter votre propre nom de domaine
        ensuite.
      </p>
      <dl className="mt-5 space-y-3 rounded-xl border border-border bg-surface p-4 dark:bg-sidebar">
        <Row label="Commune">
          {site.name}
          {population ? ` · ${population.toLocaleString('fr-FR')} habitants` : ''}
        </Row>
        <Row label="Thème">{theme?.name ?? site.theme ?? 'Institutionnel'}</Row>
        <Row label="Logo">
          {site.logo ? site.logo.name : <span className="font-normal text-secondary">Aucun, à ajouter plus tard</span>}
        </Row>
        <Row label="Pages créées">
          {drafts ? `${plural(drafts, 'brouillon', 'brouillons')} + ${COMMON_PAGES}` : COMMON_PAGES}
        </Row>
        <Row label="Obligations légales">
          {missingLegal ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-2 py-0.5 text-[12px] font-semibold text-warning">
              <TriangleAlert aria-hidden="true" className="size-3" />
              {missingLegal > 1 ? `${missingLegal} informations à compléter` : '1 information à compléter'}
            </span>
          ) : (
            'Complètes'
          )}
        </Row>
        <Row label="Adresse">
          {liveUrl ? (
            <span className="font-mono">{host(liveUrl)}</span>
          ) : (
            <span className="font-normal text-secondary">Attribuée à la mise en ligne</span>
          )}
        </Row>
      </dl>
      {drafts > 0 && (
        <p className="mt-3 flex items-start gap-2 text-[13px] text-secondary">
          <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          Les pages en brouillon ne sont pas visibles en ligne tant que vous ne les publiez pas.
        </p>
      )}
      {running && (
        <p
          role="status"
          className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-surface p-4 dark:bg-sidebar"
        >
          <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin text-brand" />
          {currentStep
            ? `Mise en ligne en cours : ${currentStep.label.toLowerCase()}…`
            : 'Mise en ligne demandée, elle démarre dans quelques secondes…'}
        </p>
      )}
    </WizardFrame>
  );
}
