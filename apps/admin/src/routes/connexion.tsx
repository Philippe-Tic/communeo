/**
 * Connexion (maquettes 6.19 « Connexion » et « Connexion — erreur »).
 */
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { CircleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { AuthLayout } from '@/components/auth-layout';
import { CheckboxField, Form, PasswordField, TextField, useZodForm } from '@/components/form';
import { Button } from '@/components/ui/button';
import { ApiError, auth } from '@/lib/api';
import { login } from '@/lib/session';

export const Route = createFileRoute('/connexion')({
  validateSearch: (search: Record<string, unknown>): { retour?: string } => (typeof search.retour === 'string' ? { retour: search.retour } : {}),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().min(1, 'Indiquez votre adresse e-mail'),
  password: z.string().min(1, 'Indiquez votre mot de passe'),
  remember: z.boolean(),
});

/** Retour à la page demandée, seulement dans l'admin */
export const safeReturn = (target: string | undefined) => (target && target.startsWith('/') && !target.startsWith('//') ? target : '/');

function LoginPage() {
  const { retour } = Route.useSearch();
  const navigate = useNavigate();
  const client = useQueryClient();
  const form = useZodForm(schema, { email: '', password: '', remember: false });
  const [error, setError] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);

  const submit = async (values: z.output<typeof schema>) => {
    setError(null);
    try {
      await login(values.email, values.password, values.remember);
      auth.setImpersonatedSite(null);
      client.clear();
      await navigate({ href: safeReturn(retour) });
    } catch (caught) {
      form.setValue('password', '');
      setError(
        caught instanceof ApiError && (caught.status === 400 || caught.status === 429)
          ? caught.message
          : 'Connexion impossible pour le moment. Réessayez dans un instant.',
      );
    }
  };

  return (
    <AuthLayout title="Connexion" documentTitle="Connexion">
      {error && (
        <div ref={alertRef} tabIndex={-1} role="alert" className="mb-4 flex gap-2.5 rounded-lg border border-danger bg-danger-alert-bg p-3 text-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      <Form form={form} onSubmit={submit} requiredNote={false} summaryTitle={(count) => `${count} champ${count > 1 ? 's' : ''} à remplir`} className="space-y-4">
        <TextField name="email" label="E-mail" hideOptional inputProps={{ type: 'email', autoComplete: 'username', inputMode: 'email' }} />
        <PasswordField
          name="password"
          label="Mot de passe"
          hideOptional
          autoComplete="current-password"
          labelAction={
            <Link to="/mot-de-passe-oublie" className="font-medium text-brand underline underline-offset-2">
              Mot de passe oublié ?
            </Link>
          }
        />
        <CheckboxField name="remember" label="Rester connecté sur cet ordinateur" help="Pendant 30 jours. À éviter sur un ordinateur partagé." />
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Connexion…' : 'Se connecter'}
        </Button>
      </Form>
      <p className="mt-5 text-[13px] text-secondary">
        Votre commune n’a pas encore de site ?{' '}
        <Link to="/inscription" className="font-semibold text-brand underline underline-offset-2">
          Créer le site de la commune
        </Link>
      </p>
    </AuthLayout>
  );
}
