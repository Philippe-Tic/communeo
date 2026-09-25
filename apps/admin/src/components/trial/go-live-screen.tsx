/**
 * Passer en live (#310, #312) : l'offre (prix selon la population INSEE), ce qui change, et le devis
 * validé en ligne par un administrateur (SIRET, adresse, e-mail de facturation, signataire et qualité).
 * Le devis validé vaut demande de passage en live : l'équipe Communeo le vérifie puis passe la commune
 * en live, sans attendre le paiement.
 */
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { CheckCircle2, FileText, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { formatEuros, formatNumber, isValidSiret, OFFER_INCLUDES, SIGNATORY_ROLES } from '@communeo/core';
import { CheckboxField, Form, SelectField, TextField, useZodForm } from '@/components/form';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { draftQuoteUrl, quotePdfUrl, quoteQuery, signQuote, type QuoteOffer, type QuoteSummary } from '@/lib/quote';
import { sessionQuery } from '@/lib/session';
import { TERMS_URL } from '@/lib/signup';
import { daysLeftLabel, formatDay, trialState } from '@/lib/trial';

const OTHER_ROLE = 'autre';

const schema = z
  .object({
    siret: z
      .string()
      .transform((value) => value.replace(/\s/g, ''))
      .refine((value) => isValidSiret(value), 'Indiquez le SIRET de la mairie : 14 chiffres, tel qu’il figure sur l’avis de situation INSEE'),
    address: z.string().trim().min(1, 'Indiquez l’adresse de la mairie'),
    billingEmail: z.string().trim().email('Indiquez l’e-mail qui recevra les factures'),
    signatoryName: z.string().trim().min(1, 'Indiquez le nom du signataire'),
    signatoryRole: z.string().min(1, 'Choisissez la qualité du signataire'),
    otherRole: z.string().trim(),
    accept: z.boolean().refine((value) => value, 'Cochez la case pour valider le devis'),
  })
  .refine((values) => values.signatoryRole !== OTHER_ROLE || values.otherRole.length > 0, {
    path: ['otherRole'],
    message: 'Précisez la qualité du signataire',
    when: (payload) => (payload.value as { signatoryRole?: string }).signatoryRole === OTHER_ROLE,
  });

function Card({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-border bg-surface p-5 dark:bg-sidebar">
      <h2 id={id} className="text-base font-semibold">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Offer({ data }: { data: QuoteOffer }) {
  const { amounts, tierLabel, population } = data.offer;
  return (
    <Card id="offre" title="L'offre">
      <p className="text-2xl font-semibold">
        {formatEuros(amounts.ht)} HT <span className="text-base font-normal text-secondary">par an</span>
      </p>
      <p className="mt-1 text-secondary">
        {amounts.vatRate > 0 ? `${formatEuros(amounts.ttc)} TTC. ` : 'TVA non applicable. '}Tranche : {tierLabel} (population INSEE :{' '}
        {formatNumber(population)}). Sans frais de mise en service.
      </p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5">
        {OFFER_INCLUDES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-secondary">
        Abonnement de 12 mois à compter du passage en live, reconduit tacitement. Facture au passage en live, déposée sur
        Chorus Pro, payable par virement sous 30 jours.
      </p>
    </Card>
  );
}

function SignedQuote({ quote }: { quote: QuoteSummary }) {
  return (
    <div role="status" className="flex flex-wrap items-start gap-3 rounded-xl border border-success/40 bg-success-bg p-5">
      <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
      <div className="min-w-0 flex-1 basis-60">
        <p>
          <strong className="font-semibold">
            Devis {quote.number} validé le {formatDay(new Date(quote.signedAt))}
          </strong>{' '}
          par {quote.signatoryName}, {quote.signatoryRole}.
        </p>
        <p className="mt-1">L'équipe Communeo le vérifie et passe votre commune en live ; vous recevrez un e-mail.</p>
      </div>
      <a href={quotePdfUrl(quote.documentId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-brand underline">
        <FileText aria-hidden="true" className="size-4" />
        Télécharger le devis (PDF)<span className="sr-only"> (nouvel onglet)</span>
      </a>
    </div>
  );
}

function QuoteForm({ data }: { data: QuoteOffer }) {
  const client = useQueryClient();
  const form = useZodForm(schema, {
    siret: data.commune.siret ?? '',
    address: data.commune.address ?? '',
    billingEmail: data.commune.billingEmail ?? '',
    signatoryName: '',
    signatoryRole: '',
    otherRole: '',
    accept: false,
  });
  const [siret, address, billingEmail, role] = form.watch(['siret', 'address', 'billingEmail', 'signatoryRole']);

  const onSubmit = async (values: z.output<typeof schema>) => {
    try {
      await signQuote({
        siret: values.siret,
        address: values.address,
        billingEmail: values.billingEmail,
        signatoryName: values.signatoryName,
        signatoryRole: values.signatoryRole === OTHER_ROLE ? values.otherRole : values.signatoryRole,
      });
    } catch (error) {
      toast.error(`Le devis n'a pas été validé : ${error instanceof ApiError ? error.message : 'le serveur ne répond pas'}.`);
      return;
    }
    await Promise.all([
      client.invalidateQueries({ queryKey: quoteQuery.queryKey }),
      client.invalidateQueries({ queryKey: sessionQuery.queryKey }),
    ]);
    toast.success("Devis validé : l'équipe Communeo le vérifie et passe votre commune en live.");
  };

  return (
    <Card id="devis" title="Devis et bon de commande">
      <p className="mb-4 text-secondary">
        Le devis engage la commune : il est validé par le maire ou une personne ayant délégation. Marché de faible montant,
        sans mise en concurrence préalable.
      </p>
      <Form
        form={form}
        onSubmit={onSubmit}
        summaryTitle={(count) => `${count > 1 ? `${count} champs empêchent` : 'Un champ empêche'} la validation du devis`}
        className="space-y-4"
      >
        <TextField name="siret" label="SIRET de la mairie" required inputProps={{ inputMode: 'numeric', autoComplete: 'off' }} />
        <TextField name="address" label="Adresse de la mairie" required inputProps={{ autoComplete: 'street-address' }} />
        <TextField
          name="billingEmail"
          label="E-mail de facturation"
          required
          help="Les factures y seront envoyées."
          inputProps={{ type: 'email', autoComplete: 'email' }}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="signatoryName" label="Nom du signataire" required inputProps={{ autoComplete: 'name' }} />
          <SelectField
            name="signatoryRole"
            label="Qualité"
            required
            placeholder="Choisir…"
            options={[...SIGNATORY_ROLES.map((value) => ({ value, label: value })), { value: OTHER_ROLE, label: 'Autre qualité' }]}
          />
        </div>
        {role === OTHER_ROLE && <TextField name="otherRole" label="Qualité du signataire" required />}
        <CheckboxField
          name="accept"
          required
          label={
            <>
              J’ai lu le devis et je le valide au nom de la commune
              {TERMS_URL && (
                <>
                  , ainsi que les{' '}
                  <a href={TERMS_URL} target="_blank" rel="noreferrer" className="text-brand underline underline-offset-2">
                    conditions d’utilisation<span className="sr-only"> (nouvel onglet)</span>
                  </a>{' '}
                  de Communeo
                </>
              )}
            </>
          }
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Button type="submit" size="lg" className="max-md:w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 aria-hidden="true" className="animate-spin" />}
            Valider le devis
          </Button>
          <a
            href={draftQuoteUrl({ siret, address, billingEmail })}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-brand underline max-md:w-full max-md:justify-center"
          >
            <FileText aria-hidden="true" className="size-4" />
            Voir le devis (PDF)<span className="sr-only"> (nouvel onglet)</span>
          </a>
        </div>
      </Form>
    </Card>
  );
}

export function GoLiveScreen() {
  const { data: user } = useSuspenseQuery(sessionQuery);
  const trial = trialState(user.site);
  const quote = useQuery({ ...quoteQuery, enabled: !!trial });
  const admin = user.municipality_role === 'admin' || user.municipality_role === 'super_admin';

  if (!trial) {
    return (
      <div className="mx-auto max-w-[760px]">
        <PageHeader title="Passer en live" />
        <p role="status" className="flex items-start gap-3 rounded-xl border border-border bg-surface p-5 dark:bg-sidebar">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
          Le site de {user.site?.name ?? 'la commune'} est en live : il n'y a rien à faire.
        </p>
      </div>
    );
  }

  const data = quote.data;
  const pending = data?.quote?.status === 'signed' ? data.quote : null;

  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      <PageHeader
        title="Passer en live"
        description={
          trial.kind === 'trial'
            ? `Essai gratuit : ${daysLeftLabel(trial.daysLeft)}, jusqu'au ${formatDay(trial.endsAt)}.`
            : "Votre essai est terminé : le site n'est plus en ligne et l'administration est en lecture seule."
        }
      />

      {quote.isError ? (
        <div role="alert" className="rounded-xl border border-danger bg-danger-alert-bg p-5">
          {quote.error instanceof ApiError ? quote.error.message : "L'offre n'a pas pu être chargée."}{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void quote.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : !data ? (
        <div aria-busy="true" className="h-48 animate-pulse rounded-xl bg-neutral-bg" />
      ) : (
        <Offer data={data} />
      )}

      <Card id="ce-qui-change" title="Ce qui change">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Le site reste en ligne après l'essai, sans limite de durée.</li>
          <li>Il n'affiche plus le bandeau « Site en préparation » et les moteurs de recherche peuvent l'indexer.</li>
          <li>Vous pouvez le relier à l'adresse de la commune (domaine personnalisé).</li>
          {trial.kind === 'expired' && <li>Le site est remis en ligne dès le passage en live.</li>}
        </ul>
      </Card>

      {data &&
        (pending ? (
          <SignedQuote quote={pending} />
        ) : admin ? (
          <>
            {data.quote?.status === 'rejected' && (
              <p className="rounded-xl border border-border bg-surface p-5 dark:bg-sidebar">
                Le devis {data.quote.number} n'a pas été retenu par l'équipe Communeo : son motif vous a été envoyé par
                e-mail. Vous pouvez valider un nouveau devis.
              </p>
            )}
            <QuoteForm data={data} />
          </>
        ) : (
          <p className="rounded-xl border border-border bg-surface p-5 dark:bg-sidebar">
            Seul un administrateur de la commune peut valider le devis.
          </p>
        ))}
    </div>
  );
}
