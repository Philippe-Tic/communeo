/**
 * Choix du mot de passe depuis un lien reçu par e-mail : invitation (« Bienvenue, Prénom »)
 * ou mot de passe oublié. Lien expiré : nouvelle invitation à demander ; lien invalide : explication.
 * Après l'enregistrement, connexion directe et arrivée sur le tableau de bord.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { CircleAlert, Clock, MailCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { AuthLayout } from '@/components/auth-layout';
import { Form, MIN_PASSWORD_LENGTH, PasswordField, useZodForm } from '@/components/form';
import { Button } from '@/components/ui/button';
import { acceptLink, linkQuery, requestInvitation, ROLE_LABELS, type LinkInfo } from '@/lib/access';
import { ApiError } from '@/lib/api';
import { login } from '@/lib/session';

const schema = z
  .object({
    password: z.string().min(1, 'Choisissez un mot de passe').min(MIN_PASSWORD_LENGTH, `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`),
    confirmation: z.string().min(1, 'Confirmez le mot de passe'),
  })
  .refine((values) => values.password === values.confirmation, {
    path: ['confirmation'],
    message: 'Les deux mots de passe ne sont pas identiques',
    when: (payload) => typeof payload.value === 'object' && payload.value !== null && Boolean((payload.value as { confirmation?: string }).confirmation),
  });

export function SetPasswordScreen({ token, purpose }: { token: string | undefined; purpose: 'invitation' | 'reset' }) {
  const query = useQuery({ ...linkQuery(token ?? ''), enabled: Boolean(token) });
  const fallbackTitle = purpose === 'invitation' ? 'Invitation' : 'Nouveau mot de passe';

  if (!token) return <InvalidLink documentTitle={fallbackTitle} />;
  if (query.isPending) {
    return (
      <AuthLayout title={fallbackTitle} documentTitle={fallbackTitle}>
        <p role="status">Vérification du lien…</p>
      </AuthLayout>
    );
  }
  if (query.isError) {
    return (
      <AuthLayout title={fallbackTitle} documentTitle={fallbackTitle}>
        <p role="alert" className="text-danger">
          Le lien n'a pas pu être vérifié. Rechargez la page dans un instant.
        </p>
      </AuthLayout>
    );
  }
  const info = query.data;
  if (info.status === 'expired') return <ExpiredLink token={token} info={info} />;
  if (info.status !== 'valid' || !info.email) return <InvalidLink documentTitle={fallbackTitle} />;
  return <PasswordForm token={token} info={info} />;
}

function PasswordForm({ token, info }: { token: string; info: LinkInfo }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const form = useZodForm(schema, { password: '', confirmation: '' });
  const [error, setError] = useState<string | null>(null);
  const invitation = info.purpose === 'invitation';
  const title = invitation ? (info.firstName ? `Bienvenue, ${info.firstName}` : 'Bienvenue') : 'Nouveau mot de passe';

  const submit = async ({ password }: z.output<typeof schema>) => {
    setError(null);
    try {
      await acceptLink(token, password);
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 400 ? caught.message : "Le mot de passe n'a pas pu être enregistré. Réessayez dans un instant.");
      return;
    }
    try {
      await login(info.email!, password);
      client.clear();
      await navigate({ to: '/' });
    } catch {
      // Mot de passe enregistré mais connexion impossible (limite atteinte…) : connexion manuelle
      await navigate({ to: '/connexion' });
    }
  };

  return (
    <AuthLayout title={title} documentTitle={invitation ? 'Invitation' : 'Nouveau mot de passe'}>
      {invitation ? (
        <p className="text-secondary">
          Vous êtes invité{info.role ? <> comme <strong className="font-semibold text-text">{ROLE_LABELS[info.role] ?? info.role}</strong></> : null}
          {info.siteName ? <> sur le site de <strong className="font-semibold text-text">{info.siteName}</strong></> : null}. Choisissez votre mot de passe pour activer votre compte.
        </p>
      ) : (
        <p className="text-secondary">
          Choisissez un nouveau mot de passe pour le compte <strong className="font-semibold text-text">{info.email}</strong>.
        </p>
      )}
      <Form form={form} onSubmit={submit} className="mt-4 space-y-4" summaryTitle={(count) => `${count} champ${count > 1 ? 's' : ''} à corriger`}>
        {/* Identifiant pour les gestionnaires de mots de passe */}
        <input type="email" name="username" autoComplete="username" value={info.email} readOnly hidden />
        <PasswordField name="password" label="Mot de passe" required autoComplete="new-password" strength help={`${MIN_PASSWORD_LENGTH} caractères minimum. Plusieurs mots faciles à retenir font un bon mot de passe.`} />
        <PasswordField name="confirmation" label="Confirmer le mot de passe" required autoComplete="new-password" />
        {error && (
          <p role="alert" className="flex gap-2 text-[13px] text-danger">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {invitation ? 'Créer mon compte' : 'Enregistrer le mot de passe'}
        </Button>
      </Form>
    </AuthLayout>
  );
}

function ExpiredLink({ token, info }: { token: string; info: LinkInfo }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const status = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state === 'sent') status.current?.focus();
  }, [state]);
  const invitation = info.purpose === 'invitation';

  return (
    <AuthLayout title="Ce lien n'est plus valable" documentTitle="Lien expiré">
      <div className="flex gap-2.5 text-secondary">
        <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p>
          {invitation
            ? `Les invitations sont valables 7 jours. ${info.siteName ? `Un administrateur de ${info.siteName}` : 'Un administrateur de la commune'} peut vous en envoyer une nouvelle.`
            : 'Les liens de réinitialisation sont valables 1 heure. Demandez-en un nouveau.'}
        </p>
      </div>
      <div className="mt-5">
        {!invitation ? (
          <Button asChild size="lg" className="w-full">
            <Link to="/mot-de-passe-oublie">Recevoir un nouveau lien</Link>
          </Button>
        ) : state === 'sent' ? (
          <div ref={status} tabIndex={-1} role="status" className="flex gap-2.5 rounded-lg bg-success-bg p-3.5 text-success">
            <MailCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>Demande envoyée : les administrateurs de la commune ont été prévenus par e-mail.</p>
          </div>
        ) : (
          <>
            <Button
              size="lg"
              className="w-full"
              disabled={state === 'sending'}
              onClick={async () => {
                setState('sending');
                try {
                  await requestInvitation(token);
                  setState('sent');
                } catch {
                  setState('failed');
                }
              }}
            >
              Demander une nouvelle invitation
            </Button>
            {state === 'failed' && (
              <p role="alert" className="mt-3 text-[13px] text-danger">
                La demande n'a pas abouti. Réessayez dans un instant.
              </p>
            )}
          </>
        )}
      </div>
      <Link to="/connexion" className="mt-5 inline-block font-semibold text-brand underline underline-offset-2">
        Retour à la connexion
      </Link>
    </AuthLayout>
  );
}

function InvalidLink({ documentTitle }: { documentTitle: string }) {
  return (
    <AuthLayout title="Ce lien ne fonctionne pas" documentTitle={documentTitle}>
      <p className="text-secondary">
        Le lien est incomplet ou a déjà servi. Copiez l'adresse entière depuis l'e-mail reçu, ou demandez un nouveau lien.
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <Button asChild size="lg" className="w-full">
          <Link to="/mot-de-passe-oublie">Recevoir un nouveau lien</Link>
        </Button>
        <Link to="/connexion" className="font-semibold text-brand underline underline-offset-2">
          Retour à la connexion
        </Link>
      </div>
    </AuthLayout>
  );
}
