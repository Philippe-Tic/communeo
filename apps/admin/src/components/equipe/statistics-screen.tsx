/**
 * Statistiques de la plateforme (handoff 6.20) : communes (dont créées ce mois-ci), utilisateurs
 * actifs, mises en ligne des 30 derniers jours avec leur taux de réussite, durée médiane, et
 * répartition des thèmes en barres (chiffres écrits : la barre n'est qu'un renfort visuel).
 */
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/components/publication/publication-screen';
import { platformStatsQuery } from '@/lib/equipe';
import { focusHeadingIfRequested } from '@/lib/focus';
import { themeName } from '@/lib/session';

const percent = (value: number, total: number, digits = 0) =>
  total ? `${((value / total) * 100).toLocaleString('fr-FR', { maximumFractionDigits: digits })} %` : '—';

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col-reverse rounded-xl border border-border bg-surface px-4 py-3.5 dark:bg-sidebar">
      <dt className="mt-0.5 text-[13px] text-secondary">{label}</dt>
      <dd className="text-[26px] leading-tight font-semibold">{value}</dd>
    </div>
  );
}

export function StatisticsScreen() {
  const stats = useQuery(platformStatsQuery);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => focusHeadingIfRequested(heading.current), []);
  useEffect(() => {
    document.title = 'Statistiques · Équipe Communeo';
  }, []);
  const data = stats.data;

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 ref={heading} className="outline-none">
          Statistiques
        </h1>
        <p className="text-secondary">Mises en ligne : 30 derniers jours</p>
      </div>

      {stats.isError ? (
        <div role="alert" className="rounded-xl border border-danger bg-danger-alert-bg p-5">
          Les statistiques n'ont pas pu être chargées.{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void stats.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : !data ? (
        <div aria-busy="true" className="h-64 animate-pulse rounded-xl bg-neutral-bg" />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Figure
              value={data.communes.total.toLocaleString('fr-FR')}
              label={`commune${data.communes.total > 1 ? 's' : ''} · +${data.communes.thisMonth} ce mois`}
            />
            <Figure
              value={data.activeUsers.toLocaleString('fr-FR')}
              label={`utilisateur${data.activeUsers > 1 ? 's' : ''} actif${data.activeUsers > 1 ? 's' : ''}`}
            />
            <Figure
              value={data.deployments.total.toLocaleString('fr-FR')}
              label={
                data.deployments.total
                  ? `mise${data.deployments.total > 1 ? 's' : ''} en ligne · ${percent(data.deployments.succeeded, data.deployments.total, 1)} réussies`
                  : 'mise en ligne'
              }
            />
            <Figure value={formatDuration(data.deployments.medianSeconds)} label="durée médiane de mise en ligne" />
          </dl>

          <section
            aria-labelledby="repartition-themes"
            className="rounded-xl border border-border bg-surface p-5 dark:bg-sidebar"
          >
            <h2 id="repartition-themes" className="text-[15px] font-semibold">
              Répartition des thèmes
            </h2>
            {data.themes.length === 0 ? (
              <p className="mt-3 text-secondary">Aucune commune pour l'instant.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.themes.map(({ theme, count }) => (
                  <li
                    key={theme}
                    className="grid grid-cols-[minmax(7rem,auto)_1fr_auto] items-center gap-3 text-[13px]"
                  >
                    <span className="font-medium">{themeName(theme)}</span>
                    <span aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-neutral-bg">
                      <span
                        className="block h-full rounded-full bg-brand"
                        style={{ width: `${(count / data.communes.total) * 100}%` }}
                      />
                    </span>
                    <span className="text-secondary tabular-nums">
                      {count} · {percent(count, data.communes.total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
