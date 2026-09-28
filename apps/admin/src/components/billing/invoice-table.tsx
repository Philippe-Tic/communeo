/**
 * Tableau des factures et avoirs (#314), pour la commune et pour l'équipe Communeo (colonnes Commune,
 * Chorus Pro et actions en plus). Sur mobile, une carte par facture. L'état est toujours écrit, jamais
 * donné par la couleur seule.
 */
import { Link } from '@tanstack/react-router';
import { FileDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatEuros } from '@communeo/core';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatShortDay, invoicePdfUrl, stateBadge, stateOf, type Invoice, type TeamInvoice } from '@/lib/billing';

const period = (invoice: Invoice) =>
  invoice.periodStart && invoice.periodEnd ? `${formatShortDay(invoice.periodStart)} – ${formatShortDay(invoice.periodEnd)}` : '—';

/** Montant d'un avoir : négatif, comme sur le document */
const amount = (invoice: Invoice) => formatEuros(invoice.kind === 'credit_note' ? -invoice.amountTTC : invoice.amountTTC);

function State({ invoice, today }: { invoice: Invoice; today?: string }) {
  const badge = stateBadge(stateOf(invoice, today));
  return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>;
}

/** Détail sous l'état : payée le…, relances, facture annulée */
function stateDetail(invoice: Invoice, team: boolean): string | null {
  if (invoice.kind === 'credit_note') return invoice.creditFor ? `Annule ${invoice.creditFor}` : null;
  if (invoice.status === 'paid' && invoice.paidAt) return `Le ${formatShortDay(invoice.paidAt)}`;
  if (invoice.status === 'cancelled') return 'Par un avoir';
  const reminders = team ? (invoice as TeamInvoice).remindersSent : 0;
  return reminders ? `${reminders} relance${reminders > 1 ? 's' : ''}` : null;
}

function Pdf({ invoice }: { invoice: Invoice }) {
  return (
    <a href={invoicePdfUrl(invoice.documentId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-brand underline">
      <FileDown aria-hidden="true" className="size-4" />
      PDF<span className="sr-only"> {invoice.kind === 'credit_note' ? "de l'avoir" : 'de la facture'} {invoice.number} (nouvel onglet)</span>
    </a>
  );
}

function Chorus({ invoice }: { invoice: TeamInvoice }) {
  if (invoice.chorusDepositedAt) {
    return (
      <span className="text-secondary">
        Déposée le {formatShortDay(invoice.chorusDepositedAt)}
        {invoice.chorusReference && <span className="block text-xs">{invoice.chorusReference}</span>}
      </span>
    );
  }
  if (invoice.status === 'cancelled') return <span className="text-secondary">—</span>;
  return <StatusBadge tone="warning">À déposer</StatusBadge>;
}

function CommuneLink({ invoice }: { invoice: TeamInvoice }) {
  return invoice.site ? (
    <Link to="/plateforme/communes/$documentId" params={{ documentId: invoice.site.documentId }} className="font-medium text-brand hover:underline">
      {invoice.site.name}
    </Link>
  ) : (
    <span className="text-secondary">{invoice.customerName}</span>
  );
}

export function InvoiceTable<T extends Invoice>({
  invoices,
  caption,
  today,
  team = false,
  actions,
}: {
  invoices: T[];
  caption: string;
  today?: string;
  team?: boolean;
  /** Équipe : menu d'actions de la ligne */
  actions?: (invoice: T) => ReactNode;
}) {
  const head = 'px-3 py-2.5 font-semibold';
  return (
    <>
      <table className="w-full text-[13px] max-lg:hidden">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-left text-[11px] tracking-[0.06em] text-secondary uppercase">
            <th scope="col" className="px-5 py-2.5 font-semibold">
              Numéro
            </th>
            {team && (
              <th scope="col" className={head}>
                Commune
              </th>
            )}
            <th scope="col" className={head}>
              Émise le
            </th>
            {!team && (
              <th scope="col" className={head}>
                Période
              </th>
            )}
            <th scope="col" className={`${head} text-right`}>
              Montant TTC
            </th>
            <th scope="col" className={head}>
              Échéance
            </th>
            <th scope="col" className={head}>
              État
            </th>
            {team && (
              <th scope="col" className={head}>
                Chorus Pro
              </th>
            )}
            <th scope="col" className="px-5 py-2.5 font-semibold">
              <span className="sr-only">{team ? 'Document et actions' : 'Document'}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => {
            const detail = stateDetail(invoice, team);
            return (
              <tr key={invoice.documentId} className="border-t border-border align-top">
                <th scope="row" className="px-5 py-3 text-left font-semibold whitespace-nowrap">
                  {invoice.number}
                  {invoice.kind === 'credit_note' && <span className="block text-xs font-normal text-secondary">Avoir</span>}
                </th>
                {team && (
                  <td className="px-3 py-3">
                    <CommuneLink invoice={invoice as unknown as TeamInvoice} />
                  </td>
                )}
                <td className="px-3 py-3 whitespace-nowrap">{formatShortDay(invoice.issuedAt)}</td>
                {!team && <td className="px-3 py-3 whitespace-nowrap text-secondary">{period(invoice)}</td>}
                <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">{amount(invoice)}</td>
                <td className="px-3 py-3 whitespace-nowrap">{invoice.kind === 'credit_note' ? '—' : formatShortDay(invoice.dueAt)}</td>
                <td className="px-3 py-3">
                  <State invoice={invoice} today={today} />
                  {detail && <span className="mt-1 block text-xs text-secondary">{detail}</span>}
                </td>
                {team && (
                  <td className="px-3 py-3">
                    <Chorus invoice={invoice as unknown as TeamInvoice} />
                  </td>
                )}
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Pdf invoice={invoice} />
                    {actions?.(invoice)}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className="divide-y divide-border lg:hidden">
        {invoices.map((invoice) => {
          const detail = stateDetail(invoice, team);
          return (
            <li key={invoice.documentId} className="space-y-1.5 p-4 text-[13px]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[15px] font-semibold">
                  {invoice.kind === 'credit_note' ? 'Avoir ' : ''}
                  {invoice.number}
                </p>
                <p className="font-semibold tabular-nums">{amount(invoice)}</p>
              </div>
              {team && (
                <p>
                  <CommuneLink invoice={invoice as unknown as TeamInvoice} />
                </p>
              )}
              <p className="text-secondary">
                Émise le {formatShortDay(invoice.issuedAt)}
                {invoice.kind !== 'credit_note' && <> · échéance le {formatShortDay(invoice.dueAt)}</>}
              </p>
              {!team && invoice.periodStart && <p className="text-secondary">Période : {period(invoice)}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <State invoice={invoice} today={today} />
                {detail && <span className="text-secondary">{detail}</span>}
                {team && invoice.status !== 'cancelled' && <Chorus invoice={invoice as unknown as TeamInvoice} />}
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Pdf invoice={invoice} />
                {actions?.(invoice)}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
