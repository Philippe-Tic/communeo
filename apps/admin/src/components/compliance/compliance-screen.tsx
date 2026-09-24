/**
 * Conformité (handoff 6.17) : score en repère, puis la liste qui compte — 18 points en 5 catégories.
 * Un point fait est coché ; un point à faire dit précisément quoi faire et mène à l'écran où on le
 * complète (réservé aux administrateurs pour les réglages légaux : un éditeur voit qui s'en charge).
 */
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';
import type { CompliancePoint, ComplianceReport } from '@communeo/core';
import { COMPLIANCE_LEVEL_LABELS } from '@communeo/core';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { complianceQuery } from '@/lib/compliance';
import { sessionQuery } from '@/lib/session';
import { cn } from '@/lib/utils';
import { ComplianceGauge } from './compliance-gauge';

/**
 * Lien vers l'écran où l'on complète le point ; pour un éditeur, un réglage réservé aux
 * administrateurs n'est pas un lien (il les verrait refusé) mais dit qui s'en charge.
 */
export function PointAction({
  point,
  canAdmin,
  text = point.label,
}: {
  point: CompliancePoint;
  canAdmin: boolean;
  text?: string;
}) {
  // Assuré par Communeo : rien à ouvrir, on dit qui s'en charge
  if (!point.target)
    return (
      <span>
        <span className="font-semibold">{text}</span>
        {text !== point.todo && <span className="block text-secondary">{point.todo}</span>}
      </span>
    );
  if (point.target.adminOnly && !canAdmin)
    return (
      <span>
        <span className="font-semibold">{text}</span> <span className="text-secondary">(par un administrateur)</span>
      </span>
    );
  return (
    <Link
      // Écrans de l'admin nommés par le calcul partagé (@communeo/core)
      to={point.target.to as '/'}
      search={point.target.search as never}
      className="font-semibold text-text underline decoration-1 underline-offset-2 hover:text-brand"
    >
      {text}
    </Link>
  );
}

function Category({ report, id, canAdmin }: { report: ComplianceReport; id: string; canAdmin: boolean }) {
  const category = report.categories.find((entry) => entry.id === id)!;
  const points = report.points.filter((point) => point.category === id);
  const complete = category.done === category.total;
  return (
    <section
      aria-labelledby={`conformite-${id}`}
      className="rounded-xl border border-border bg-surface dark:bg-sidebar"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-3">
        <h2 id={`conformite-${id}`} className="text-[15px] font-semibold">
          {category.label}
        </h2>
        <span className={cn('text-[13px] font-semibold tabular-nums', complete ? 'text-success' : 'text-warning')}>
          {category.done} / {category.total}
          <span className="sr-only"> en ordre</span>
        </span>
      </div>
      <ul className="divide-y divide-border text-[13px]">
        {points.map((point) => (
          <li key={point.id} className="flex items-start gap-2.5 px-3.5 py-2.5">
            {point.done ? (
              <span
                aria-hidden="true"
                className="mt-px grid size-[18px] shrink-0 place-items-center rounded-full bg-success-bg text-success"
              >
                <Check className="size-3" strokeWidth={3} />
              </span>
            ) : (
              <span aria-hidden="true" className="mt-px size-[18px] shrink-0 rounded-full border-2 border-warning" />
            )}
            {point.done ? (
              <p className="text-secondary">
                {point.label}
                <span className="sr-only"> : en ordre</span>
                {point.platform && <span className="block text-[12px]">Assuré par Communeo</span>}
              </p>
            ) : (
              <p>
                <span className="sr-only">À faire : </span>
                <PointAction point={point} canAdmin={canAdmin} />
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ComplianceScreen() {
  const { data: user } = useSuspenseQuery(sessionQuery);
  const report = useQuery(complianceQuery);
  const canAdmin = user.municipality_role === 'admin' || user.municipality_role === 'super_admin';
  const data = report.data;

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader title="Conformité" />
      {report.isError ? (
        <div role="alert" className="rounded-xl border border-danger bg-danger-alert-bg p-5">
          La conformité n'a pas pu être calculée.{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void report.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : !data ? (
        <div aria-busy="true" className="h-64 animate-pulse rounded-xl bg-neutral-bg" />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-5">
            <ComplianceGauge score={data.score} />
            <div className="min-w-0 flex-1 basis-72">
              <h2 className="text-[22px] font-semibold">Conformité : {COMPLIANCE_LEVEL_LABELS[data.level]}</h2>
              <p className="mt-1 text-secondary">
                {data.done === data.total
                  ? `Les ${data.total} points sont en ordre.`
                  : `${data.done} points sur ${data.total} sont en ordre. ${
                      data.total - data.done > 1
                        ? `Les ${data.total - data.done} restants sont listés ci-dessous`
                        : 'Le dernier est listé ci-dessous'
                    }, chacun avec l'écran à compléter. Le score n'est qu'un repère : ce qui compte, c'est la liste.`}
              </p>
            </div>
          </div>
          {data.next && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-warning bg-warning-bg px-4 py-3">
              <span className="text-[13px] font-semibold text-warning">À faire en premier</span>
              <PointAction point={data.next} canAdmin={canAdmin} text={data.next.todo} />
              <span className="basis-full text-[13px] text-secondary">{data.next.why}</span>
            </div>
          )}
          <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 min-[1400px]:grid-cols-5">
            {data.categories.map((category) => (
              <Category key={category.id} report={data} id={category.id} canAdmin={canAdmin} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
