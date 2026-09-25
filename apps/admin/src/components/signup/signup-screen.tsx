/**
 * Inscription d'une mairie en libre-service (#309) : commune (recherche dans le référentiel officiel),
 * nom et e-mail de la personne, conditions. La confirmation part à l'adresse officielle de la mairie ;
 * sans adresse connue, la demande attend l'équipe Communeo.
 */
import { Link } from '@tanstack/react-router';
import { CircleAlert, Loader2, MailCheck, Search, UserCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { AuthLayout } from '@/components/auth-layout';
import { CheckboxField, controlClass, Field, Form, TextField, useZodForm } from '@/components/form';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { requestSignup, searchSignupCommunes, TERMS_URL, type SignupCommune, type SignupResult } from '@/lib/signup';
import { cn } from '@/lib/utils';

const schema = z.object({
  insee: z.string().min(1, 'Choisissez votre commune dans la liste'),
  first_name: z.string().trim().min(1, 'Indiquez votre prénom'),
  last_name: z.string().trim().min(1, 'Indiquez votre nom'),
  email: z.string().trim().min(1, 'Indiquez votre adresse e-mail').email('Adresse e-mail invalide, ex. prenom.nom@mairie.fr'),
  terms: z.boolean().refine((value) => value, 'Acceptez les conditions d’utilisation pour continuer'),
});

const describe = (commune: SignupCommune) =>
  `${commune.name} (${commune.postalCodes[0] ?? commune.insee})${commune.department ? ` · ${commune.department}` : ''}`;

export function SignupScreen() {
  const form = useZodForm(schema, { insee: '', first_name: '', last_name: '', email: '', terms: false });
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<SignupCommune[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [chosen, setChosen] = useState<SignupCommune | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SignupResult | null>(null);
  const [trap, setTrap] = useState('');
  const alertRef = useRef<HTMLDivElement>(null);
  const shown = !chosen && query.trim().length >= 2 ? matches : null;

  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);

  // Recherche au fil de la frappe (nom ou code postal), après une courte pause
  useEffect(() => {
    const q = query.trim();
    if (chosen || q.length < 2) return;
    const timer = setTimeout(() => {
      setSearching(true);
      searchSignupCommunes(q)
        .then(setMatches)
        .catch(() => {
          setMatches(null);
          setError('La recherche des communes ne répond pas. Réessayez dans quelques minutes.');
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, chosen]);

  const choose = (commune: SignupCommune) => {
    setChosen(commune);
    setQuery(describe(commune));
    setMatches(null);
    form.setValue('insee', commune.insee, { shouldValidate: form.formState.isSubmitted });
  };

  const submit = async (values: z.output<typeof schema>) => {
    setError(null);
    try {
      setResult(await requestSignup({ ...values, website: trap }));
    } catch (caught) {
      setError(
        caught instanceof ApiError && [400, 409, 429, 502].includes(caught.status)
          ? caught.message
          : 'La demande n’a pas pu être envoyée. Réessayez dans un instant.',
      );
    }
  };

  if (result) return <SignupSent result={result} commune={chosen?.name ?? ''} />;

  return (
    <AuthLayout title="Créer le site de votre commune" documentTitle="Inscription">
      <p className="text-secondary">30 jours d’essai gratuit, sans moyen de paiement. Vous payez quand vous mettez le site en ligne à l’adresse de la commune.</p>
      {error && (
        <div ref={alertRef} tabIndex={-1} role="alert" className="mt-4 flex gap-2.5 rounded-lg border border-danger bg-danger-alert-bg p-3 text-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      <Form form={form} onSubmit={submit} className="mt-4 space-y-4" summaryTitle={(count) => `${count} champ${count > 1 ? 's' : ''} à corriger`}>
        <Field name="insee" label="Votre commune" required help="Nom ou code postal." error={form.formState.errors.insee?.message}>
          {(props) => (
            <div>
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-secondary" />
                <input
                  {...props}
                  type="search"
                  autoComplete="off"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    if (chosen) {
                      setChosen(null);
                      form.setValue('insee', '');
                    }
                  }}
                  className={cn(controlClass, 'h-11 pl-9')}
                />
                {searching && <Loader2 aria-hidden="true" className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />}
              </div>
              <p role="status" className="sr-only">
                {shown ? `${shown.length} commune${shown.length > 1 ? 's' : ''} trouvée${shown.length > 1 ? 's' : ''}` : ''}
              </p>
              {shown && (
                <ul aria-label="Communes trouvées" className="mt-2 divide-y divide-border rounded-xl border border-border bg-surface dark:bg-sidebar">
                  {shown.length === 0 ? (
                    <li className="px-4 py-3 text-secondary">Aucune commune ne correspond. Vérifiez l’orthographe ou essayez le code postal.</li>
                  ) : (
                    shown.map((commune) => (
                      <li key={commune.insee}>
                        {commune.taken ? (
                          <p className="px-4 py-2.5">
                            <span className="font-semibold">{describe(commune)}</span>
                            <span className="block text-[13px] text-secondary">Déjà sur Communeo : demandez à l’administrateur du site de vous inviter.</span>
                          </p>
                        ) : (
                          <button type="button" onClick={() => choose(commune)} className="flex min-h-11 w-full items-center px-4 py-2 text-left font-semibold hover:bg-surface-hover">
                            {describe(commune)}
                          </button>
                        )}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="first_name" label="Prénom" required inputProps={{ autoComplete: 'given-name' }} />
          <TextField name="last_name" label="Nom" required inputProps={{ autoComplete: 'family-name' }} />
        </div>
        <TextField
          name="email"
          label="Votre e-mail"
          required
          help="Ce sera votre identifiant. La confirmation, elle, part à l’adresse officielle de la mairie."
          inputProps={{ type: 'email', autoComplete: 'email', inputMode: 'email' }}
        />
        {/* Piège à robots : invisible et ignoré par les personnes */}
        <p aria-hidden="true" className="hidden">
          <label>
            Site internet
            <input tabIndex={-1} autoComplete="off" value={trap} onChange={(event) => setTrap(event.target.value)} />
          </label>
        </p>
        <CheckboxField
          name="terms"
          required
          label={
            TERMS_URL ? (
              <>
                J’accepte les{' '}
                <a href={TERMS_URL} target="_blank" rel="noreferrer" className="text-brand underline underline-offset-2">
                  conditions d’utilisation<span className="sr-only"> (nouvelle fenêtre)</span>
                </a>{' '}
                de Communeo
              </>
            ) : (
              'J’accepte les conditions d’utilisation de Communeo'
            )
          }
        />
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Envoi…' : 'Créer le site'}
        </Button>
      </Form>
      <p className="mt-5 text-[13px] text-secondary">
        Déjà un compte ?{' '}
        <Link to="/connexion" className="font-semibold text-brand underline underline-offset-2">
          Se connecter
        </Link>
      </p>
    </AuthLayout>
  );
}

function SignupSent({ result, commune }: { result: SignupResult; commune: string }) {
  const heading = useRef<HTMLDivElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <AuthLayout title={result.status === 'sent' ? 'Vérifiez la boîte de la mairie' : 'Demande enregistrée'} documentTitle="Inscription envoyée">
      <div ref={heading} tabIndex={-1} role="status" className="flex gap-2.5 outline-none">
        {result.status === 'sent' ? (
          <>
            <MailCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand" />
            <div className="space-y-2">
              <p>
                Pour vérifier que la demande vient bien de la commune, un e-mail de confirmation a été envoyé à l’adresse officielle de la mairie
                {commune ? <> de {commune}</> : null} : <strong>{result.to}</strong>.
              </p>
              <p className="text-secondary">Le lien est valable 7 jours. Une fois la création confirmée, vous choisissez votre mot de passe et arrivez dans l’assistant de démarrage.</p>
            </div>
          </>
        ) : (
          <>
            <UserCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand" />
            <div className="space-y-2">
              <p>L’équipe Communeo vérifie la demande{commune ? <> pour {commune}</> : null} et vous écrit sous deux jours ouvrés.</p>
              <p className="text-secondary">L’adresse officielle de la mairie n’est pas connue de l’annuaire du service public : la vérification se fait à la main.</p>
            </div>
          </>
        )}
      </div>
      <Link to="/connexion" className="mt-5 inline-block font-semibold text-brand underline underline-offset-2">
        Retour à la connexion
      </Link>
    </AuthLayout>
  );
}
