/**
 * Session expirée (handoff 6.5) : fenêtre de reconnexion sur place, par le mot de passe du compte.
 * La page reste affichée derrière : rien de ce qui est en cours n'est perdu. Pas de fermeture
 * sans se reconnecter (tout appel à l'API échouerait), mais on peut changer de compte.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Dialog } from 'radix-ui';
import { CircleAlert, Loader2, LockKeyhole } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Form, PasswordField, useZodForm } from '@/components/form';
import { Button } from '@/components/ui/button';
import { dialogContentClass, DialogIcon } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { ApiError, sessionEvents } from '@/lib/api';
import { login } from '@/lib/session';

const schema = z.object({ password: z.string().min(1, 'Indiquez votre mot de passe') });

export function SessionExpiredDialog({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useZodForm(schema, { password: '' });
  const client = useQueryClient();
  const navigate = useNavigate();
  const href = useRouterState({ select: (state) => state.location.href });

  useEffect(() => sessionEvents.subscribe((event) => event === 'lost' && setOpen(true)), []);

  const submit = async ({ password }: z.output<typeof schema>) => {
    setError(null);
    try {
      await login(email, password);
    } catch (caught) {
      form.setValue('password', '');
      setError(caught instanceof ApiError && (caught.status === 400 || caught.status === 429) ? caught.message : 'Connexion impossible pour le moment. Réessayez dans un instant.');
      return;
    }
    setOpen(false);
    form.reset();
    sessionEvents.emit('restored');
    await client.invalidateQueries();
    toast.success('Vous êtes reconnecté.');
  };

  const otherAccount = async () => {
    setOpen(false);
    await navigate({ to: '/connexion', search: { retour: href } });
    client.clear();
  };

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content className={dialogContentClass} onEscapeKeyDown={(event) => event.preventDefault()} onInteractOutside={(event) => event.preventDefault()}>
          <div className="flex gap-3">
            <DialogIcon tone="info" icon={LockKeyhole} />
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-[17px] font-semibold">Votre session a expiré</Dialog.Title>
              <Dialog.Description className="mt-1.5 text-secondary">
                Par sécurité, la connexion a une durée limitée. Reconnectez-vous pour continuer : la page reste telle quelle, vos modifications en cours ne sont pas perdues.
              </Dialog.Description>
              <Form form={form} onSubmit={submit} requiredNote={false} className="mt-4 space-y-4" summaryTitle={() => 'Mot de passe manquant'}>
                <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
                <PasswordField name="password" label={`Mot de passe de ${email}`} hideOptional autoComplete="current-password" />
                {error && (
                  <p role="alert" className="flex gap-2 text-[13px] text-danger">
                    <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                    {error}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button type="button" variant="tertiary" onClick={() => void otherAccount()}>
                    Changer de compte
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 aria-hidden="true" className="animate-spin" />}
                    Se reconnecter
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
