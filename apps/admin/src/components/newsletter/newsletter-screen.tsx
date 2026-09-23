/**
 * Newsletter (handoff 6.15) : trois chiffres, liste des abonnés (recherche, filtre par état, 20 par
 * page), export CSV. Le désabonnement est une action, jamais une suppression : le RGPD impose la trace.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Download, Loader2, Mail, MoreHorizontal, UserMinus } from 'lucide-react';
import { useState } from 'react';
import { Pagination } from '@/components/content-list/pagination';
import { Toolbar } from '@/components/content-list/toolbar';
import type { Noun } from '@/components/content-list/types';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { currentMonthName, formatShortDate } from '@/lib/dates';
import {
  downloadSubscribersCsv,
  newsletterStatsQuery,
  subscriberName,
  subscribersQuery,
  SUBSCRIBERS_PAGE_SIZE,
  unsubscribe,
  type Subscriber,
  type SubscriberState,
} from '@/lib/newsletter';
import { cn } from '@/lib/utils';

const NOUN: Noun = { one: 'abonné', many: 'abonnés', feminine: false, definite: "l'abonné" };

export interface NewsletterSearch {
  q?: string;
  etat?: SubscriberState;
  page?: number;
}

export function newsletterSearch(raw: Record<string, unknown>): NewsletterSearch {
  const search: NewsletterSearch = {};
  if (typeof raw.q === 'string' && raw.q.trim()) search.q = raw.q;
  if (raw.etat === 'actifs' || raw.etat === 'desabonnes') search.etat = raw.etat;
  const page = Number(raw.page);
  if (Number.isInteger(page) && page > 1) search.page = page;
  return search;
}

const errorText = (error: unknown) => (error instanceof ApiError ? error.message : 'erreur inattendue');

export function NewsletterScreen({ search, onSearchChange }: { search: NewsletterSearch; onSearchChange: (patch: Partial<NewsletterSearch>, options?: { replace?: boolean }) => void }) {
  const client = useQueryClient();
  const params = { q: search.q ?? '', etat: search.etat, page: search.page ?? 1 };
  const stats = useQuery(newsletterStatsQuery);
  const list = useQuery(subscribersQuery(params));
  const [exporting, setExporting] = useState(false);
  const [confirm, setConfirm] = useState<Subscriber | null>(null);
  const filtered = !!params.q || !!params.etat;
  const empty = stats.isSuccess && stats.data.total === 0;

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadSubscribersCsv();
    } catch (error) {
      toast.error(`L'export n'a pas pu être préparé : ${errorText(error)}`);
    } finally {
      setExporting(false);
    }
  };

  const copy = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success(`${email} copiée.`);
    } catch {
      toast.error("L'adresse n'a pas pu être copiée.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Newsletter"
        actions={
          !empty && (
            <Button variant="secondary" onClick={() => void exportCsv()} disabled={exporting}>
              {exporting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Download aria-hidden="true" />}
              {exporting ? 'Export en cours…' : 'Exporter (CSV)'}
            </Button>
          )
        }
      />

      {empty ? (
        <div className="rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <span aria-hidden="true" className="mx-auto grid size-14 place-items-center rounded-full bg-brand-soft text-brand">
            <Mail className="size-6" />
          </span>
          <h2 className="mt-4 text-[17px]">Aucun abonné pour l'instant</h2>
          <p className="mx-auto mt-2 max-w-md text-secondary">Les habitants s'inscrivent avec le formulaire « Newsletter » du site. Leurs adresses apparaîtront ici.</p>
        </div>
      ) : (
        <>
          <dl className="mb-4 grid grid-cols-3 gap-2 md:gap-3">
            <Figure value={stats.data?.total} label="abonnés au total" />
            <Figure value={stats.data?.active} label="actifs" />
            <Figure value={stats.data ? `+${stats.data.thisMonth}` : undefined} label={`nouveaux en ${currentMonthName()}`} />
          </dl>

          <div className="rounded-xl border border-border bg-surface md:overflow-hidden">
            <Toolbar
              noun={NOUN}
              query={params.q}
              onQuery={(q) => onSearchChange({ q: q || undefined, page: undefined }, { replace: true })}
              filters={[
                {
                  key: 'etat',
                  label: 'État',
                  value: params.etat,
                  options: [
                    { value: 'actifs', label: 'Actifs' },
                    { value: 'desabonnes', label: 'Désabonnés' },
                  ],
                },
              ]}
              onFilter={(_, value) => onSearchChange({ etat: value as SubscriberState | undefined, page: undefined })}
            />

            <p role="status" className="sr-only">
              {list.isSuccess && !list.isPlaceholderData ? `${list.data.total} abonné${list.data.total > 1 ? 's' : ''}` : ''}
            </p>

            {list.isPending ? (
              <div aria-busy="true" className="p-8 text-center text-secondary">
                Chargement des abonnés…
              </div>
            ) : list.isError ? (
              <div role="alert" className="p-8 text-center">
                <p className="font-semibold">La liste n'a pas pu être chargée.</p>
                <Button variant="secondary" className="mt-3" onClick={() => void list.refetch()}>
                  Réessayer
                </Button>
              </div>
            ) : list.data.total === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-[15px] font-semibold">Aucun abonné ne correspond {params.q ? `à « ${params.q} »` : 'au filtre choisi'}</p>
                {filtered && (
                  <Button variant="secondary" className="mt-4" onClick={() => onSearchChange({ q: undefined, etat: undefined, page: undefined })}>
                    Effacer la recherche et le filtre
                  </Button>
                )}
              </div>
            ) : (
              <div aria-busy={list.isFetching} className={cn(list.isPlaceholderData && 'opacity-60 motion-safe:transition-opacity')}>
                <table className="hidden w-full table-fixed border-collapse md:table">
                  <caption className="sr-only">
                    Abonnés à la newsletter, page {params.page} sur {list.data.pageCount}
                  </caption>
                  <thead>
                    <tr className="border-b border-border-row text-left text-xs font-semibold tracking-wide text-secondary uppercase">
                      <th scope="col" className="w-[38%] py-3 pl-4 font-semibold">
                        E-mail
                      </th>
                      <th scope="col" className="w-[26%] px-3 py-3 font-semibold">
                        Nom
                      </th>
                      <th scope="col" className="w-[18%] px-3 py-3 font-semibold">
                        Inscrit le
                      </th>
                      <th scope="col" className="px-3 py-3 font-semibold">
                        État
                      </th>
                      <th scope="col" className="w-14 py-3 pr-4">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.rows.map((row) => (
                      <tr key={row.documentId} className="border-b border-border-row text-[13px] last:border-b-0 hover:bg-surface-hover">
                        <td className={cn('py-2.5 pl-4 break-all', !row.active && 'text-secondary')}>{row.email}</td>
                        <td className="px-3 break-words">{subscriberName(row) || <span aria-label="Non renseigné">—</span>}</td>
                        <td className="px-3 whitespace-nowrap">{row.subscribed_at ? formatShortDate(new Date(row.subscribed_at)) : '—'}</td>
                        <td className="px-3">
                          <SubscriberBadge subscriber={row} />
                        </td>
                        <td className="pr-4 text-right">
                          <RowMenu subscriber={row} onCopy={() => void copy(row.email)} onUnsubscribe={() => setConfirm(row)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <ul className="divide-y divide-border-row md:hidden">
                  {list.data.rows.map((row) => (
                    <li key={row.documentId} className="flex items-start gap-2 py-3 pr-2 pl-4">
                      <div className="min-w-0 flex-1">
                        <p className={cn('font-medium break-all', !row.active && 'text-secondary')}>{row.email}</p>
                        <p className="mt-0.5 text-[13px] text-secondary">
                          {[subscriberName(row), row.subscribed_at ? `inscrit le ${formatShortDate(new Date(row.subscribed_at))}` : null].filter(Boolean).join(' · ')}
                        </p>
                        <SubscriberBadge subscriber={row} className="mt-2" />
                      </div>
                      <RowMenu subscriber={row} onCopy={() => void copy(row.email)} onUnsubscribe={() => setConfirm(row)} large />
                    </li>
                  ))}
                </ul>

                <Pagination
                  page={params.page}
                  pageCount={list.data.pageCount}
                  pageSize={SUBSCRIBERS_PAGE_SIZE}
                  total={list.data.total}
                  onPage={(page) => onSearchChange({ page: page === 1 ? undefined : page })}
                />
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(value) => !value && setConfirm(null)}
        tone="warning"
        icon={UserMinus}
        title={`Désabonner ${confirm?.email ?? ''} ?`}
        description="Cette adresse ne recevra plus la newsletter. Elle reste dans la liste comme « Désabonné » : seul l'habitant peut se réinscrire depuis le site."
        confirmLabel="Désabonner"
        onConfirm={async () => {
          const subscriber = confirm!;
          try {
            await unsubscribe(subscriber.documentId);
            toast.success(`${subscriber.email} est désabonnée.`);
          } catch (error) {
            toast.error(`Le désabonnement n'a pas pu être enregistré : ${errorText(error)}`);
          }
          setConfirm(null);
          await client.invalidateQueries({ queryKey: ['newsletter-subscribers'] });
        }}
      />
    </div>
  );
}

function Figure({ value, label }: { value: number | string | undefined; label: string }) {
  return (
    <div className="flex flex-col-reverse rounded-xl border border-border bg-surface px-3 py-3 md:px-4 md:py-4">
      <dt className="mt-1 text-[12px] text-secondary md:text-[13px]">{label}</dt>
      <dd className="text-[22px] leading-tight font-semibold md:text-[28px]">{value ?? <span className="inline-block h-7 w-12 rounded bg-border-row motion-safe:animate-pulse" aria-label="Chargement" />}</dd>
    </div>
  );
}

function SubscriberBadge({ subscriber, className }: { subscriber: Subscriber; className?: string }) {
  return subscriber.active ? (
    <StatusBadge tone="success" className={className}>
      Actif
    </StatusBadge>
  ) : (
    <StatusBadge tone="neutral" className={className}>
      Désabonné{subscriber.unsubscribed_at ? <span className="sr-only">{` le ${formatShortDate(new Date(subscriber.unsubscribed_at))}`}</span> : null}
    </StatusBadge>
  );
}

function RowMenu({ subscriber, onCopy, onUnsubscribe, large }: { subscriber: Subscriber; onCopy: () => void; onUnsubscribe: () => void; large?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={large ? 'icon-lg' : 'icon'} aria-label={`Actions pour ${subscriber.email}`}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onCopy}>
          <Copy aria-hidden="true" />
          Copier l'adresse e-mail
        </DropdownMenuItem>
        {subscriber.active && (
          <DropdownMenuItem destructive onSelect={onUnsubscribe}>
            <UserMinus aria-hidden="true" />
            Désabonner…
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
