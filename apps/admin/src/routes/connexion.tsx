/**
 * Connexion (version minimale ; sessions, mot de passe oublié et sécurité : #132 et #188).
 */
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CircleAlert } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CommuneoLogo } from '@/components/shell/logo';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { login } from '@/lib/session';

export const Route = createFileRoute('/connexion')({
  validateSearch: (search: Record<string, unknown>): { retour?: string } => (typeof search.retour === 'string' ? { retour: search.retour } : {}),
  component: LoginPage,
});

const inputClass =
  'mt-1.5 block h-11 w-full rounded-lg border border-border-input bg-surface px-3 text-base text-text md:h-10 md:text-sm dark:bg-sidebar';

function LoginPage() {
  const { retour } = Route.useSearch();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'Connexion · Communeo';
  }, []);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await login(String(form.get('email') ?? ''), String(form.get('password') ?? ''));
      client.clear();
      // Retour à la page demandée, seulement dans l'admin
      const target = retour && retour.startsWith('/') && !retour.startsWith('//') ? retour : '/';
      await navigate({ href: target });
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 400
          ? 'Adresse e-mail ou mot de passe incorrect.'
          : caught instanceof ApiError && caught.status === 429
            ? 'Trop de tentatives de connexion. Réessayez dans quelques minutes.'
            : 'Connexion impossible pour le moment. Réessayez dans un instant.',
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <CommuneoLogo className="mx-auto mb-8 block w-40" />
        <div className="rounded-xl border border-border bg-surface p-6 md:p-8">
          <h1 className="text-[22px]">Connexion à l'administration</h1>
          {error && (
            <div ref={errorRef} tabIndex={-1} role="alert" className="mt-4 flex gap-2 rounded-lg border border-danger bg-danger-alert-bg p-3 text-danger">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
            <div>
              <label htmlFor="email" className="font-medium">
                Adresse e-mail
              </label>
              <input id="email" name="email" type="email" autoComplete="username" required className={inputClass} />
            </div>
            <div>
              <label htmlFor="password" className="font-medium">
                Mot de passe
              </label>
              <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
