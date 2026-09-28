/**
 * Facturation de l'espace équipe (#314) : ce qui reste à déposer sur Chorus Pro, à encaisser et en
 * retard, pour toutes les communes. Les factures sont émises par le serveur (passage en live, échéances
 * annuelles) ; l'équipe les dépose sur Chorus Pro, les marque payées à réception du virement, relance,
 * annule par un avoir et arrête le renouvellement d'une commune qui résilie.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Ban, BellRing, CircleAlert, FilePlus2, Landmark, MoreHorizontal, RefreshCcw, Send, Wallet, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { addCalendarDays, billingSummary, formatEuros } from '@communeo/core';
import { InvoiceFormDialog } from '@/components/billing/invoice-form-dialog';
import { InvoiceTable } from '@/components/billing/invoice-table';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  cancelInvoice,
  formatCalendarDay,
  issueFirstInvoice,
  markDeposited,
  markPaid,
  refreshBilling,
  remind,
  setRenewal,
  stateOf,
  teamBillingQuery,
  type TeamBilling,
  type TeamInvoice,
} from '@/lib/billing';
import { focusHeadingIfRequested } from '@/lib/focus';
import { cn } from '@/lib/utils';
import { ReasonDialog } from './reason-dialog';

const failure = (error: unknown) => (error instanceof ApiError ? error.message : 'erreur inattendue');

const FILTERS = [
  { id: 'deposer', label: 'À déposer sur Chorus Pro', match: (invoice: TeamInvoice) => !invoice.chorusDepositedAt && invoice.status !== 'cancelled' },
  { id: 'attente', label: 'À encaisser', match: (invoice: TeamInvoice, today: string) => ['pending', 'overdue'].includes(stateOf(invoice, today)) },
  { id: 'retard', label: 'En retard', match: (invoice: TeamInvoice, today: string) => stateOf(invoice, today) === 'overdue' },
  { id: 'payees', label: 'Payées', match: (invoice: TeamInvoice) => invoice.status === 'paid' },
  { id: 'toutes', label: 'Toutes', match: () => true },
] as const;
type FilterId = (typeof FILTERS)[number]['id'];

type Action =
  | { kind: 'paid' | 'chorus' | 'remind' | 'cancel'; invoice: TeamInvoice }
  | { kind: 'issue'; site: { documentId: string; name: string } }
  | { kind: 'renewal'; site: { documentId: string; name: string; enabled: boolean; periodEnd: string | null } };

const validDay = (today: string) => (value: string) =>
  !/^\d{4}-\d{2}-\d{2}$/.test(value) ? 'Date invalide.' : value > today ? 'La date ne peut pas être dans le futur.' : null;

function Kpi({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: 'danger' | 'warning' }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 dark:bg-sidebar">
      <dt className="text-[11px] font-semibold tracking-[0.06em] text-secondary uppercase">{label}</dt>
      <dd className={cn('mt-1 text-2xl font-semibold tabular-nums', tone === 'danger' && 'text-danger', tone === 'warning' && 'text-warning')}>{value}</dd>
      {detail && <dd className="mt-0.5 text-[13px] text-secondary">{detail}</dd>}
    </div>
  );
}

function Actions({ invoice, onAction }: { invoice: TeamInvoice; onAction: (action: Action) => void }) {
  const open = invoice.kind === 'invoice' && invoice.status === 'issued';
  type Item = { kind: 'chorus' | 'paid' | 'remind' | 'cancel'; label: string; icon: LucideIcon; destructive?: boolean; show: boolean };
  const all: Item[] = [
    { kind: 'chorus', label: 'Déposée sur Chorus Pro…', icon: Landmark, show: !invoice.chorusDepositedAt && invoice.status !== 'cancelled' },
    { kind: 'paid', label: 'Marquer payée…', icon: Wallet, show: open },
    { kind: 'remind', label: 'Relancer la commune…', icon: BellRing, show: open },
    { kind: 'cancel', label: 'Annuler par un avoir…', icon: Ban, destructive: true, show: invoice.kind === 'invoice' && invoice.status !== 'cancelled' },
  ];
  const items = all.filter((item) => item.show);
  // Sans action possible : la place du bouton reste, pour aligner les colonnes
  if (!items.length) return <span aria-hidden="true" className="inline-block size-9 max-lg:hidden" />;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-9" aria-label={`Actions : ${invoice.kind === 'credit_note' ? 'avoir' : 'facture'} ${invoice.number}`}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {items.map(({ kind, label, icon: Icon, destructive }) => (
          <DropdownMenuItem key={kind} destructive={destructive} onSelect={() => onAction({ kind, invoice })}>
            <Icon aria-hidden="true" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Content({ data, onAction }: { data: TeamBilling; onAction: (action: Action) => void }) {
  const [filter, setFilter] = useState<FilterId>('deposer');
  const summary = billingSummary(data.invoices, data.today);
  const current = FILTERS.find((item) => item.id === filter)!;
  const shown = data.invoices.filter((invoice) => current.match(invoice, data.today));
  const count = (id: FilterId) => data.invoices.filter((invoice) => FILTERS.find((item) => item.id === id)!.match(invoice, data.today)).length;

  return (
    <>
      {data.missingSettings.length > 0 && (
        <div className="flex gap-3 rounded-xl border border-warning bg-warning-bg p-4">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>
            <strong>Factures incomplètes :</strong> {data.missingSettings.join(', ')} {data.missingSettings.length > 1 ? 'ne sont pas renseignées' : "n'est pas renseignée"} sur
            le serveur. Les factures émises afficheront « [à compléter] » à la place : ajoutez {data.missingSettings.length > 1 ? 'ces variables' : 'cette variable'} au fichier
            .env de production, puis redémarrez Strapi.
          </p>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Facturé" value={formatEuros(summary.issued)} detail="Hors factures annulées" />
        <Kpi label="Encaissé" value={formatEuros(summary.collected)} />
        <Kpi label="À encaisser" value={formatEuros(summary.outstanding)} />
        <Kpi
          label="En retard"
          value={formatEuros(summary.overdue)}
          detail={`${summary.overdueCount} facture${summary.overdueCount > 1 ? 's' : ''}`}
          tone={summary.overdueCount ? 'danger' : undefined}
        />
        <Kpi label="À déposer" value={String(summary.toDeposit)} detail="Sur Chorus Pro" tone={summary.toDeposit ? 'warning' : undefined} />
      </dl>

      {data.uninvoiced.length > 0 && (
        <section aria-labelledby="sans-facture" className="space-y-2">
          <h2 id="sans-facture" className="text-xl">
            Communes en live sans facture <span className="font-normal text-secondary">· {data.uninvoiced.length}</span>
          </h2>
          <ul className="space-y-2">
            {data.uninvoiced.map((site) => (
              <li key={site.documentId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 dark:bg-sidebar">
                <div>
                  <Link to="/plateforme/communes/$documentId" params={{ documentId: site.documentId }} className="font-semibold text-brand hover:underline">
                    {site.name}
                  </Link>
                  <p className="text-[13px] text-secondary">
                    {site.hasAcceptedQuote ? 'Devis accepté : la facture peut être émise.' : 'Aucun devis accepté : la commune doit valider un devis (écran « Passer en live »).'}
                  </p>
                </div>
                {site.hasAcceptedQuote && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => onAction({ kind: 'issue', site })}>
                    <FilePlus2 aria-hidden="true" />
                    Émettre la facture…
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="factures" className="space-y-3">
        <h2 id="factures" className="text-xl">
          Factures et avoirs
        </h2>
        <div role="group" aria-label="Filtrer les factures" className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={filter === item.id ? 'primary' : 'secondary'}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label} <span className="tabular-nums">({count(item.id)})</span>
            </Button>
          ))}
        </div>
        <div className="relative overflow-x-auto rounded-xl border border-border bg-surface dark:bg-sidebar">
          <p role="status" className="sr-only">
            {shown.length} document{shown.length > 1 ? 's' : ''} : {current.label.toLowerCase()}
          </p>
          {shown.length === 0 ? (
            <p className="p-5 text-secondary">{data.invoices.length === 0 ? "Aucune facture émise pour l'instant." : 'Aucune facture dans cette liste.'}</p>
          ) : (
            <InvoiceTable
              team
              invoices={shown}
              today={data.today}
              caption={`Factures et avoirs : ${current.label.toLowerCase()}`}
              actions={(invoice) => <Actions invoice={invoice} onAction={onAction} />}
            />
          )}
        </div>
      </section>

      {data.renewals.length > 0 && (
        <section aria-labelledby="renouvellements" className="space-y-3">
          <div>
            <h2 id="renouvellements" className="text-xl">
              Renouvellements
            </h2>
            <p className="mt-1 text-secondary">La facture de l'année suivante est émise le lendemain de la fin de période, sauf si le renouvellement est arrêté (résiliation).</p>
          </div>
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface dark:bg-sidebar">
            {data.renewals.map((site) => (
              <li key={site.documentId} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{site.name}</p>
                  <p className="text-[13px] text-secondary">
                    {!site.periodEnd
                      ? 'Pas encore de facture'
                      : site.enabled
                        ? `Prochaine facture le ${formatCalendarDay(addCalendarDays(site.periodEnd, 1))}`
                        : `Résiliée : l'abonnement prend fin le ${formatCalendarDay(site.periodEnd)}`}
                  </p>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={() => onAction({ kind: 'renewal', site })}>
                  <RefreshCcw aria-hidden="true" />
                  {site.enabled ? 'Arrêter le renouvellement…' : 'Reprendre le renouvellement…'}
                  <span className="sr-only"> : {site.name}</span>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export function TeamBillingScreen() {
  const client = useQueryClient();
  const billing = useQuery(teamBillingQuery);
  const [action, setAction] = useState<Action | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => focusHeadingIfRequested(heading.current), []);
  useEffect(() => {
    document.title = 'Facturation · Équipe Communeo';
  }, []);
  const today = billing.data?.today ?? new Date().toISOString().slice(0, 10);
  const close = (open: boolean) => !open && setAction(null);

  const run = async (work: () => Promise<unknown>, success: string, error: string) => {
    try {
      await work();
    } catch (caught) {
      // Les fenêtres de saisie affichent l'erreur de l'API ; les confirmations, ce message
      if (caught instanceof ApiError) throw caught;
      throw new Error(`${error} : ${failure(caught)}`);
    }
    void refreshBilling(client);
    toast.success(success);
  };
  const invoice = action && 'invoice' in action ? action.invoice : null;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 ref={heading} className="outline-none">
          Facturation
        </h1>
        <p className="mt-1 text-secondary">
          Factures émises au passage en live puis à chaque échéance. Déposez-les sur Chorus Pro, puis marquez-les payées à réception du virement.
        </p>
      </div>

      {billing.isError ? (
        <div role="alert" className="rounded-xl border border-danger bg-danger-alert-bg p-5">
          La facturation n'a pas pu être chargée.{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void billing.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : !billing.data ? (
        <div aria-busy="true" className="h-64 animate-pulse rounded-xl bg-neutral-bg" />
      ) : (
        <Content data={billing.data} onAction={setAction} />
      )}

      <InvoiceFormDialog
        open={action?.kind === 'chorus'}
        onOpenChange={close}
        icon={Landmark}
        title={invoice ? `${invoice.kind === 'credit_note' ? 'Avoir' : 'Facture'} ${invoice.number} déposé${invoice.kind === 'credit_note' ? '' : 'e'} sur Chorus Pro` : ''}
        description="Indiquez la date du dépôt et, si vous l'avez, le numéro de flux donné par Chorus Pro."
        initialValues={{ depositedAt: today, reference: '' }}
        fields={[
          { name: 'depositedAt', label: 'Date du dépôt', type: 'date', required: true, validate: validDay(today), inputProps: { max: today } },
          { name: 'reference', label: 'Numéro de flux Chorus Pro', type: 'text', inputProps: { maxLength: 100 } },
        ]}
        confirmLabel="Enregistrer le dépôt"
        onSubmit={(values) =>
          invoice
            ? run(() => markDeposited(invoice.documentId, { depositedAt: values.depositedAt!, reference: values.reference ?? '' }), `${invoice.number} est déposée sur Chorus Pro.`, "Le dépôt n'a pas été enregistré")
            : Promise.resolve()
        }
      />
      <InvoiceFormDialog
        open={action?.kind === 'paid'}
        onOpenChange={close}
        icon={Wallet}
        title={invoice ? `Facture ${invoice.number} payée` : ''}
        description={invoice ? `${invoice.site?.name ?? invoice.customerName} : ${formatEuros(invoice.amountTTC)} attendus. Indiquez la date et le montant du virement reçu.` : ''}
        initialValues={{ paidAt: today, amount: invoice ? String(invoice.amountTTC) : '', note: '' }}
        fields={[
          { name: 'paidAt', label: 'Date du virement', type: 'date', required: true, validate: validDay(today), inputProps: { max: today } },
          {
            name: 'amount',
            label: 'Montant reçu (€)',
            type: 'number',
            required: true,
            validate: (value) => (Number(value) > 0 ? null : 'Indiquez un montant positif.'),
            inputProps: { min: '0.01', step: '0.01', inputMode: 'decimal' },
          },
          { name: 'note', label: 'Note', type: 'text', help: 'Par exemple le libellé du virement.', inputProps: { maxLength: 500 } },
        ]}
        confirmLabel="Marquer payée"
        onSubmit={(values) =>
          invoice
            ? run(
                () => markPaid(invoice.documentId, { paidAt: values.paidAt!, amount: Number(values.amount), note: values.note ?? '' }),
                `${invoice.number} est payée.`,
                "Le paiement n'a pas été enregistré",
              )
            : Promise.resolve()
        }
      />
      <ConfirmDialog
        open={action?.kind === 'remind'}
        onOpenChange={close}
        tone="info"
        icon={Send}
        title={invoice ? `Relancer ${invoice.site?.name ?? invoice.customerName} ?` : ''}
        description={invoice ? `Un rappel de la facture ${invoice.number}, avec son PDF, part à ${invoice.customerEmail} et aux administrateurs de la commune.` : ''}
        confirmLabel="Envoyer le rappel"
        onConfirm={() => (invoice ? run(() => remind(invoice.documentId), 'Le rappel est envoyé.', "Le rappel n'a pas été envoyé") : undefined)}
      />
      <ReasonDialog
        open={action?.kind === 'cancel'}
        onOpenChange={close}
        title={invoice ? `Annuler la facture ${invoice.number} ?` : ''}
        description="Un avoir du même montant est émis et envoyé à la commune, avec ce motif ; déposez-le ensuite sur Chorus Pro. La facture est conservée, marquée annulée."
        confirmLabel="Émettre l'avoir"
        onReject={(reason) => (invoice ? run(() => cancelInvoice(invoice.documentId, reason), `L'avoir de ${invoice.number} est émis.`, "L'avoir n'a pas été émis") : Promise.resolve())}
      />
      <ConfirmDialog
        open={action?.kind === 'issue'}
        onOpenChange={close}
        tone="info"
        icon={FilePlus2}
        title={action?.kind === 'issue' ? `Émettre la facture de ${action.site.name} ?` : ''}
        description="Montant et coordonnées du devis accepté, période de 12 mois à partir d'aujourd'hui. Elle part à l'adresse de facturation de la commune."
        confirmLabel="Émettre la facture"
        onConfirm={() =>
          action?.kind === 'issue' ? run(() => issueFirstInvoice(action.site.documentId), `La facture de ${action.site.name} est émise.`, "La facture n'a pas été émise") : undefined
        }
      />
      <ConfirmDialog
        open={action?.kind === 'renewal'}
        onOpenChange={close}
        tone={action?.kind === 'renewal' && action.site.enabled ? 'danger' : 'info'}
        icon={RefreshCcw}
        title={action?.kind === 'renewal' ? `${action.site.enabled ? 'Arrêter' : 'Reprendre'} le renouvellement de ${action.site.name} ?` : ''}
        description={
          action?.kind === 'renewal'
            ? action.site.enabled
              ? "À utiliser quand la commune résilie : aucune facture n'est émise à l'échéance. Le site n'est pas retiré, faites-le séparément si besoin."
              : "La facture de l'année suivante sera émise à l'échéance."
            : ''
        }
        confirmLabel={action?.kind === 'renewal' && action.site.enabled ? 'Arrêter le renouvellement' : 'Reprendre le renouvellement'}
        onConfirm={() =>
          action?.kind === 'renewal'
            ? run(
                () => setRenewal(action.site.documentId, !action.site.enabled),
                action.site.enabled ? `Le renouvellement de ${action.site.name} est arrêté.` : `Le renouvellement de ${action.site.name} reprend.`,
                "Le renouvellement n'a pas été modifié",
              )
            : undefined
        }
      />
    </div>
  );
}
