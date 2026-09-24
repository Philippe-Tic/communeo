/**
 * Journal d'activité (#190) : qui a fait quoi, quand. Même liste pour l'administrateur d'une
 * commune (sa commune, actions de l'équipe Communeo comprises, signalées) et pour l'équipe
 * (toutes les communes, filtre par commune, adresse IP des connexions). Gardé 6 mois.
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { controlClass } from '@/components/form';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  ACTION_LABELS,
  activityQuery,
  COMMUNE_ACTIONS,
  describeTarget,
  type ActivityAction,
  type ActivityEntry,
} from '@/lib/activity';
import { formatListDate } from '@/lib/dates';
import { communesQuery } from '@/lib/equipe';
import { themeName } from '@/lib/session';
import { cn } from '@/lib/utils';

function Who({ entry }: { entry: ActivityEntry }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="font-semibold">{entry.actorName ?? '—'}</span>
      {entry.onBehalf && (
        <StatusBadge tone="neutral" icon={<ShieldCheck aria-hidden="true" className="size-3" />}>
          Équipe Communeo
        </StatusBadge>
      )}
    </span>
  );
}

export function ActivityLog({ platform }: { platform?: boolean }) {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<ActivityAction | ''>('');
  const [site, setSite] = useState('');
  const communes = useQuery({ ...communesQuery, enabled: !!platform });
  const log = useQuery(activityQuery({ page, action: action || undefined, site: site || undefined }));
  const actions = platform ? (Object.keys(ACTION_LABELS) as ActivityAction[]) : COMMUNE_ACTIONS;
  const pages = log.data?.meta.pagination.pageCount ?? 1;
  const total = log.data?.meta.pagination.total ?? 0;
  const describe = (entry: ActivityEntry) => describeTarget(entry, themeName);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[13px]">
          <span className="font-medium">Action</span>
          <select
            value={action}
            onChange={(event) => {
              setAction(event.target.value as ActivityAction | '');
              setPage(1);
            }}
            className={cn(controlClass, 'h-11 w-auto md:h-9')}
          >
            <option value="">Toutes</option>
            {actions.map((value) => (
              <option key={value} value={value}>
                {ACTION_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        {platform && (
          <label className="flex items-center gap-2 text-[13px]">
            <span className="font-medium">Commune</span>
            <select
              value={site}
              onChange={(event) => {
                setSite(event.target.value);
                setPage(1);
              }}
              className={cn(controlClass, 'h-11 w-auto max-w-[260px] md:h-9')}
            >
              <option value="">Toutes</option>
              {(communes.data ?? [])
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
                .map((commune) => (
                  <option key={commune.documentId} value={commune.documentId}>
                    {commune.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        <p className="text-[13px] text-secondary md:ml-auto">Les entrées sont gardées 6 mois.</p>
      </div>

      {log.isError ? (
        <div role="alert" className="rounded-xl border border-danger bg-danger-alert-bg p-5">
          Le journal n'a pas pu être chargé.{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void log.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : !log.data ? (
        <div aria-busy="true" className="h-64 animate-pulse rounded-xl bg-neutral-bg" />
      ) : (
        <section aria-label="Entrées du journal" className="rounded-xl border border-border bg-surface dark:bg-sidebar">
          <p role="status" className="sr-only">
            {total} entrée{total > 1 ? 's' : ''}
          </p>
          {log.data.data.length === 0 ? (
            <p className="p-5 text-secondary">
              {action || site ? 'Aucune entrée ne correspond.' : "Rien n'a encore été enregistré."}
            </p>
          ) : (
            <>
              <table className="w-full text-[13px] max-lg:hidden">
                <caption className="sr-only">Journal d'activité, du plus récent au plus ancien</caption>
                <thead>
                  <tr className="text-left text-[11px] tracking-[0.06em] text-secondary uppercase">
                    <th scope="col" className="px-5 py-2.5 font-semibold">
                      Date
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Qui
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Action
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Élément
                    </th>
                    {platform && (
                      <th scope="col" className="px-5 py-2.5 font-semibold">
                        Commune
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {log.data.data.map((entry) => (
                    <tr key={entry.id} className="border-t border-border align-top">
                      <td className="px-5 py-3 whitespace-nowrap text-secondary">
                        {formatListDate(new Date(entry.at))}
                      </td>
                      <td className="px-3 py-3">
                        <Who entry={entry} />
                      </td>
                      <td className="px-3 py-3">{ACTION_LABELS[entry.action]}</td>
                      <td className="px-3 py-3 break-words text-secondary">{describe(entry)}</td>
                      {platform && (
                        <td className="px-5 py-3">
                          {entry.site ? (
                            <Link
                              to="/plateforme/communes/$documentId"
                              params={{ documentId: entry.site.documentId }}
                              className="font-medium text-brand hover:underline"
                            >
                              {entry.site.name}
                            </Link>
                          ) : (
                            <span className="text-secondary">Plateforme</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="divide-y divide-border lg:hidden">
                {log.data.data.map((entry) => (
                  <li key={entry.id} className="space-y-1 p-4 text-[13px]">
                    <p className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[15px] font-semibold">{ACTION_LABELS[entry.action]}</span>
                      <span className="text-secondary">{formatListDate(new Date(entry.at))}</span>
                    </p>
                    <Who entry={entry} />
                    {describe(entry) && <p className="break-words text-secondary">{describe(entry)}</p>}
                    {platform && <p className="text-secondary">{entry.site?.name ?? 'Plateforme'}</p>}
                  </li>
                ))}
              </ul>
              {pages > 1 && (
                <nav
                  aria-label="Pages du journal"
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-[13px]"
                >
                  <p className="text-secondary">
                    Page {page} sur {pages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Plus récentes
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={page >= pages}
                      onClick={() => setPage(page + 1)}
                    >
                      Plus anciennes
                    </Button>
                  </div>
                </nav>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
