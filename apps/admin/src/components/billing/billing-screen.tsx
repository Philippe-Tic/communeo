/**
 * Facturation de la commune (#314) : les factures de l'abonnement Communeo, leur état et leur PDF.
 * Elles arrivent aussi par Chorus Pro ; le règlement se fait par virement.
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { addCalendarDays } from '@communeo/core';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { formatCalendarDay, invoicesQuery, type Renewal } from '@/lib/billing';
import { InvoiceTable } from './invoice-table';

function RenewalNote({ renewal }: { renewal: Renewal }) {
  if (!renewal.periodEnd) return null;
  return (
    <p className="rounded-xl border border-border bg-surface p-4 dark:bg-sidebar">
      {renewal.enabled ? (
        <>
          Abonnement en cours jusqu'au <strong>{formatCalendarDay(renewal.periodEnd)}</strong>, reconduit tacitement : la facture suivante sera
          émise le {formatCalendarDay(addCalendarDays(renewal.periodEnd, 1))}. Pour résilier, prévenez l'équipe Communeo au moins un mois
          avant l'échéance.
        </>
      ) : (
        <>
          Abonnement résilié : il prend fin le <strong>{formatCalendarDay(renewal.periodEnd)}</strong>, aucune nouvelle facture ne sera émise.
        </>
      )}
    </p>
  );
}

export function BillingScreen() {
  const billing = useQuery(invoicesQuery);
  const data = billing.data;

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <PageHeader
        title="Facturation"
        description="Les factures de l'abonnement Communeo. Elles vous sont aussi transmises par Chorus Pro ; le règlement se fait par virement, sous 30 jours."
      />

      {billing.isError ? (
        <div role="alert" className="rounded-xl border border-danger bg-danger-alert-bg p-5">
          Les factures n'ont pas pu être chargées.{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void billing.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : !data ? (
        <div aria-busy="true" className="h-48 animate-pulse rounded-xl bg-neutral-bg" />
      ) : (
        <>
          {data.renewal && <RenewalNote renewal={data.renewal} />}
          <section aria-label="Factures" className="relative overflow-x-auto rounded-xl border border-border bg-surface dark:bg-sidebar">
            {data.invoices.length === 0 ? (
              <p className="p-5 text-secondary">
                Aucune facture pour l'instant : la première est émise au passage en live, d'après le devis validé.{' '}
                <Link to="/passer-en-live" className="font-medium text-brand underline">
                  Passer en live
                </Link>
              </p>
            ) : (
              <InvoiceTable invoices={data.invoices} caption="Factures et avoirs, de la plus récente à la plus ancienne" />
            )}
          </section>
          <p className="text-[13px] text-secondary">
            Une question sur une facture ? Écrivez à l'équipe Communeo en rappelant son numéro.
          </p>
        </>
      )}
    </div>
  );
}
