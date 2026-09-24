/**
 * Étape 2 — Votre commune (#150) : recherche par nom ou code postal, puis pré-remplissage depuis
 * les données publiques (population et coordonnées : INSEE / geo.api.gouv.fr ; mairie : Annuaire
 * de l'administration). Chaque valeur trouvée porte sa source ; tout reste modifiable. Si les
 * services ne répondent pas, on saisit à la main. Le SIRET trouvé est gardé pour les mentions légales.
 */
import { Check, CircleAlert, Loader2, Search } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { summarizeWeek, type CommuneDetails, type CommuneMatch } from '@communeo/core/client';
import { Form, TextField, useZodForm } from '@/components/form';
import { controlClass } from '@/components/form';
import {
  informationsPayload,
  informationsSchema,
  informationsValues,
  type InformationsValues,
} from '@/components/settings/informations-screen';
import { OpeningHoursEditor } from '@/components/settings/opening-hours-editor';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { communeDetails, searchCommunes } from '@/lib/onboarding';
import { cn } from '@/lib/utils';
import { WizardActions, type StepProps } from '../onboarding-screen';
import { WizardFrame } from '../wizard-frame';
import { StepHeading } from './step-heading';

const FORM_ID = 'assistant-commune';
type Source = 'INSEE' | 'Annuaire du service public';

function SourceBadge({ source }: { source?: Source }) {
  if (!source) return null;
  return (
    <span className="rounded-full bg-neutral-bg px-2 py-0.5 text-[11px] font-semibold text-secondary">
      <span className="sr-only">Source : </span>
      {source}
    </span>
  );
}

const describe = (match: CommuneMatch) =>
  `${match.name} (${match.postalCodes[0] ?? match.insee})${match.department ? ` · ${match.department}` : ''}`;

export function CommuneStep({ site, step, next, back, later, alert }: StepProps & { alert: ReactNode }) {
  const form = useZodForm(informationsSchema, informationsValues(site));
  const searchId = useId();
  const [query, setQuery] = useState(site.name);
  const [matches, setMatches] = useState<CommuneMatch[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [chosen, setChosen] = useState<CommuneMatch | null>(null);
  // Commune déjà choisie (retour sur l'étape) : pas de nouvelle recherche tant qu'on ne tape rien
  const [edited, setEdited] = useState(!site.code_insee);
  const [insee, setInsee] = useState(site.code_insee ?? '');
  const [siret, setSiret] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'found' | 'partial' | 'unavailable'>('idle');
  const [sources, setSources] = useState<Partial<Record<keyof InformationsValues, Source>>>({});
  const [editHours, setEditHours] = useState(false);
  const [saving, setSaving] = useState(false);
  // Résultats affichés tant qu'on cherche (pas après un choix, ni sous 2 caractères)
  const shown = edited && !chosen && query.trim().length >= 2 ? matches : null;
  const hours = form.watch('hours');
  const email = form.watch('contact_mail');

  // Recherche au fil de la frappe (nom ou code postal), après une courte pause
  useEffect(() => {
    if (!edited || (chosen && query === describe(chosen))) return;
    const q = query.trim();
    if (q.length < 2) return;
    const timer = setTimeout(() => {
      setSearching(true);
      searchCommunes(q)
        .then((found) => setMatches(found))
        .catch(() => {
          setMatches(null);
          setState('unavailable');
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, chosen, edited]);

  const choose = async (match: CommuneMatch) => {
    setChosen(match);
    setQuery(describe(match));
    setMatches(null);
    setState('loading');
    let details: CommuneDetails;
    try {
      details = await communeDetails(match.insee);
    } catch (error) {
      setState(error instanceof ApiError && error.status === 404 ? 'partial' : 'unavailable');
      setInsee(match.insee);
      return;
    }
    const found: Partial<Record<keyof InformationsValues, Source>> = {};
    const set = (name: keyof InformationsValues, value: unknown, source: Source) => {
      form.setValue(name, value as never, { shouldDirty: true, shouldValidate: false });
      found[name] = source;
    };
    setInsee(details.insee);
    if (details.population != null) set('population', String(details.population), 'INSEE');
    if (details.latitude != null && details.longitude != null)
      set('coordinates', `${details.latitude}, ${details.longitude}`, 'INSEE');
    const hall = details.townHall;
    if (hall?.address) set('address', hall.address, 'Annuaire du service public');
    if (hall?.phone) set('contact_phone', hall.phone, 'Annuaire du service public');
    if (hall?.email) set('contact_mail', hall.email, 'Annuaire du service public');
    if (hall?.hours)
      set('hours', { days: hall.hours.days, closures: form.getValues('hours.closures') }, 'Annuaire du service public');
    setSiret(hall?.siret ?? null);
    setSources(found);
    setState(hall ? 'found' : 'partial');
  };

  /** Valeurs → réglages du Site (informations, code INSEE, SIRET s'il n'était pas renseigné) */
  const payload = (values: InformationsValues) => {
    const { data, cached } = informationsPayload(values, site);
    const extra: Record<string, unknown> = insee ? { code_insee: insee } : {};
    if (siret && !site.mentions_legales?.siret) extra.mentions_legales = { ...(site.mentions_legales ?? {}), siret };
    return { data: { ...data, ...extra }, cached: { ...cached, ...extra } };
  };

  const submit = async (values: InformationsValues, then: typeof next) => {
    setSaving(true);
    try {
      const { data, cached } = payload(values);
      await then(data, cached);
    } finally {
      setSaving(false);
    }
  };

  const week = summarizeWeek({ days: hours.days as never, closures: [] });

  return (
    <WizardFrame
      step={step}
      actions={
        <WizardActions
          onBack={back}
          tertiary={{
            label: 'Enregistrer et continuer plus tard',
            onClick: () => void form.handleSubmit((values) => submit(values, later))(),
          }}
          primary={{ label: 'Continuer', form: FORM_ID, busy: saving }}
        />
      }
    >
      {alert}
      <StepHeading step={step}>Votre commune</StepHeading>

      <div className="relative mt-5">
        <label htmlFor={searchId} className="font-medium">
          Rechercher la commune <span className="font-normal text-secondary">(nom ou code postal)</span>
        </label>
        <div className="relative mt-1.5">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-secondary"
          />
          <input
            id={searchId}
            type="search"
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setChosen(null);
              setEdited(true);
            }}
            className={cn(controlClass, 'h-12 pl-9 md:h-11')}
          />
          {searching && (
            <Loader2 aria-hidden="true" className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
          )}
        </div>
        <p role="status" className="sr-only">
          {shown ? `${shown.length} commune${shown.length > 1 ? 's' : ''} trouvée${shown.length > 1 ? 's' : ''}` : ''}
        </p>
        {shown && (
          <ul
            aria-label="Communes trouvées"
            className="mt-2 divide-y divide-border rounded-xl border border-border bg-surface dark:bg-sidebar"
          >
            {shown.length === 0 ? (
              <li className="px-4 py-3 text-secondary">
                Aucune commune ne correspond. Vérifiez l'orthographe ou essayez le code postal.
              </li>
            ) : (
              shown.map((match) => (
                <li key={match.insee}>
                  <button
                    type="button"
                    onClick={() => void choose(match)}
                    className="flex min-h-12 w-full flex-wrap items-center justify-between gap-x-3 px-4 py-2 text-left hover:bg-surface-hover"
                  >
                    <span className="font-semibold">{describe(match)}</span>
                    {match.population != null && (
                      <span className="text-[13px] text-secondary">
                        {match.population.toLocaleString('fr-FR')} hab.
                      </span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div role="status" aria-live="polite" className="mt-4">
        {state === 'loading' && (
          <p className="flex items-center gap-2 text-secondary">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Recherche des informations publiques…
          </p>
        )}
        {state === 'found' && (
          <p className="flex items-center gap-2 rounded-lg bg-success-bg px-4 py-3 font-medium text-success">
            <Check aria-hidden="true" className="size-4" /> Informations trouvées. Vérifiez-les et corrigez si besoin.
          </p>
        )}
        {state === 'partial' && (
          <p className="flex items-center gap-2 rounded-lg bg-warning-bg px-4 py-3 font-medium text-warning">
            <CircleAlert aria-hidden="true" className="size-4" /> La mairie n'a pas été trouvée dans l'annuaire :
            complétez ses coordonnées.
          </p>
        )}
        {state === 'unavailable' && (
          <p className="flex items-center gap-2 rounded-lg bg-warning-bg px-4 py-3 font-medium text-warning">
            <CircleAlert aria-hidden="true" className="size-4" /> Les données publiques ne répondent pas : renseignez
            les informations à la main.
          </p>
        )}
      </div>

      <Form
        form={form}
        id={FORM_ID}
        className="mt-4 space-y-4 rounded-xl border border-border bg-surface p-4 md:p-5 dark:bg-sidebar"
        summaryTitle={(count) => `${count} information${count > 1 ? 's' : ''} à corriger`}
        onSubmit={(values) => submit(values, next)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="population"
            label="Population"
            badge={<SourceBadge source={sources.population} />}
            inputProps={{ inputMode: 'numeric', autoComplete: 'off' }}
          />
          <div>
            <p className="font-medium">Code INSEE</p>
            <p className="mt-1.5 flex h-11 items-center rounded-lg border border-border bg-neutral-bg px-3 md:h-10">
              {insee || <span className="text-secondary">Choisissez la commune ci-dessus</span>}
            </p>
          </div>
        </div>
        <TextField
          name="address"
          label="Adresse de la mairie"
          badge={<SourceBadge source={sources.address} />}
          inputProps={{ autoComplete: 'off' }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="contact_phone"
            label="Téléphone"
            badge={<SourceBadge source={sources.contact_phone} />}
            inputProps={{ type: 'tel', autoComplete: 'off' }}
          />
          <TextField
            name="contact_mail"
            label="E-mail"
            required
            badge={<SourceBadge source={sources.contact_mail} />}
            help={
              state !== 'idle' && state !== 'loading' && !sources.contact_mail
                ? email
                  ? "Non trouvé dans l'annuaire : vérifiez celui-ci."
                  : 'Non trouvé, à renseigner.'
                : undefined
            }
            inputProps={{ type: 'email', autoComplete: 'off' }}
          />
        </div>
        <TextField
          name="coordinates"
          label="Coordonnées GPS"
          badge={<SourceBadge source={sources.coordinates} />}
          help="Latitude, longitude : pour la carte et la météo du site."
          inputProps={{ autoComplete: 'off' }}
        />
        <div>
          <p className="flex flex-wrap items-center gap-2 font-medium">
            Horaires d'ouverture <SourceBadge source={sources.hours} />
          </p>
          {editHours ? (
            <div className="mt-2">
              <OpeningHoursEditor name="hours" />
            </div>
          ) : (
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-neutral-bg px-3 py-2.5 text-[14px]">
              <span>
                {week.length
                  ? week.map((group) => `${group.days} : ${group.hours}`).join(' · ')
                  : 'Pas encore renseignés'}
              </span>
              <Button type="button" variant="tertiary" size="sm" onClick={() => setEditHours(true)}>
                Modifier<span className="sr-only"> les horaires</span>
              </Button>
            </div>
          )}
        </div>
      </Form>
    </WizardFrame>
  );
}
