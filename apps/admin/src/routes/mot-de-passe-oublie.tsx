/**
 * Mot de passe oublié (maquette 6.19) : même réponse, que le compte existe ou non.
 */
import { createFileRoute, Link } from '@tanstack/react-router';
import { MailCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { AuthLayout } from '@/components/auth-layout';
import { Form, TextField, useZodForm } from '@/components/form';
import { Button } from '@/components/ui/button';
import { forgotPassword } from '@/lib/access';

export const Route = createFileRoute('/mot-de-passe-oublie')({ component: ForgotPasswordPage });

const schema = z.object({ email: z.string().trim().min(1, 'Indiquez votre adresse e-mail').pipe(z.email("L'adresse e-mail n'est pas valide")) });

function ForgotPasswordPage() {
  const form = useZodForm(schema, { email: '' });
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const confirmation = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (sentTo) confirmation.current?.focus();
  }, [sentTo]);

  return (
    <AuthLayout title="Mot de passe oublié" documentTitle="Mot de passe oublié">
      {sentTo ? (
        <>
          <div ref={confirmation} tabIndex={-1} role="status" className="flex gap-2.5 rounded-lg bg-success-bg p-3.5 text-success">
            <MailCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              Si un compte existe pour <strong>{sentTo}</strong>, un e-mail vient d'être envoyé avec un lien valable 1 heure.
            </p>
          </div>
          <p className="mt-4 text-secondary">Pas d'e-mail ? Vérifiez les indésirables, ou demandez à un administrateur de la commune de réinitialiser votre mot de passe.</p>
        </>
      ) : (
        <Form
          form={form}
          requiredNote={false}
          className="space-y-4"
          summaryTitle={() => 'Adresse e-mail à corriger'}
          onSubmit={async ({ email }) => {
            setFailed(false);
            try {
              await forgotPassword(email);
              setSentTo(email);
            } catch {
              setFailed(true);
            }
          }}
        >
          <p className="text-secondary">Indiquez l'adresse e-mail de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
          <TextField name="email" label="E-mail" hideOptional inputProps={{ type: 'email', autoComplete: 'username', inputMode: 'email' }} />
          {failed && (
            <p role="alert" className="text-[13px] text-danger">
              L'envoi n'a pas abouti. Réessayez dans un instant.
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
            Recevoir un lien
          </Button>
        </Form>
      )}
      <Link to="/connexion" className="mt-5 inline-block font-semibold text-brand underline underline-offset-2">
        Retour à la connexion
      </Link>
    </AuthLayout>
  );
}
