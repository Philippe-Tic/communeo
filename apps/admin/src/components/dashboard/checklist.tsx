/**
 * Checklist « Pour terminer votre site » (#154, handoff 6.6 variante 1g) : sur le tableau de bord
 * après l'assistant de création, tant que les sept points ne sont pas faits ou que la commune ne l'a
 * pas masquée ; à la place de la prochaine action recommandée. Chaque point à faire mène à l'écran
 * où le compléter ; ceux des réglages légaux sont signalés « par un administrateur » aux rédacteurs.
 */
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';
import { useId, useState } from 'react';
import type { OnboardingChecklist } from '@communeo/core';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { hideChecklist } from '@/lib/onboarding';

export function Checklist({ checklist, canAdmin }: { checklist: OnboardingChecklist; canAdmin: boolean }) {
  const client = useQueryClient();
  const headingId = useId();
  const [hiding, setHiding] = useState(false);
  const hide = async () => {
    setHiding(true);
    try {
      await hideChecklist(client);
      // La carte disparaît : le focus revient au titre de la page
      const heading = document.querySelector<HTMLElement>('main h1');
      if (heading) {
        heading.tabIndex = -1;
        heading.focus();
      }
      toast.success('Checklist masquée. La prochaine action recommandée reste affichée.');
    } catch (error) {
      toast.error(
        `La checklist n'a pas été masquée : ${error instanceof ApiError ? error.message : 'le serveur ne répond pas'}.`,
      );
    } finally {
      setHiding(false);
    }
  };

  return (
    <section aria-labelledby={headingId} className="rounded-xl border border-border bg-surface p-5 dark:bg-sidebar">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id={headingId} className="text-[16px] font-semibold">
          Pour terminer votre site{' '}
          <span className="font-normal text-secondary">
            {checklist.done} étape{checklist.done > 1 ? 's' : ''} sur {checklist.total} faite
            {checklist.done > 1 ? 's' : ''}
          </span>
        </h2>
        <button
          type="button"
          onClick={() => void hide()}
          disabled={hiding}
          className="min-h-6 text-[13px] font-semibold text-brand underline-offset-2 hover:underline disabled:opacity-60 max-md:min-h-11"
        >
          Masquer<span className="sr-only"> la checklist</span>
        </button>
      </div>
      <div
        role="progressbar"
        aria-label="Avancement"
        aria-valuemin={0}
        aria-valuemax={checklist.total}
        aria-valuenow={checklist.done}
        aria-valuetext={`${checklist.done} sur ${checklist.total}`}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-bg"
      >
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${(checklist.done / checklist.total) * 100}%` }}
        />
      </div>
      <ul className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {checklist.items.map((item) => {
          const reachable = !item.target.adminOnly || canAdmin;
          return (
            <li key={item.id} className="flex items-start gap-2.5">
              {item.done ? (
                <span
                  aria-hidden="true"
                  className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-bg text-success"
                >
                  <Check className="size-3.5" />
                </span>
              ) : (
                <span aria-hidden="true" className="mt-0.5 size-5 shrink-0 rounded-full border-2 border-warning" />
              )}
              <span className="min-w-0">
                {item.done ? (
                  <span className="text-secondary">
                    {item.label}
                    <span className="sr-only"> : fait</span>
                  </span>
                ) : reachable ? (
                  <Link
                    to={item.target.to as '/'}
                    search={item.target.search as never}
                    className="font-semibold text-text underline underline-offset-2 hover:text-brand"
                  >
                    {item.label}
                    <span className="sr-only"> : {item.todo}</span>
                  </Link>
                ) : (
                  <span className="font-semibold">{item.label}</span>
                )}
                {!item.done && (
                  <span aria-hidden={reachable} className="block text-[13px] text-secondary">
                    {item.todo}
                    {!reachable && ' · par un administrateur'}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
