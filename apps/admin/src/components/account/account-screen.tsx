/**
 * Mon compte (#367) : l'adresse e-mail, le rôle et la commune (en lecture), le prénom et le nom,
 * le mot de passe (avec l'actuel, 10 caractères minimum). Chaque carte a son propre bouton :
 * un changement de nom ne demande pas de mot de passe, et inversement. Préférences (#366) : le mode
 * clair / sombre, appliqué tout de suite et gardé dans ce navigateur.
 */
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { CircleAlert } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { z } from 'zod';
import { Form, FormSection, MIN_PASSWORD_LENGTH, PasswordField, RequiredNote, TextField, UnsavedChangesGuard, useZodForm } from '@/components/form';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { changePassword, sendOwnPasswordReset, updateProfile } from '@/lib/account';
import { ApiError } from '@/lib/api';
import { COLOR_SCHEME_OPTIONS, setColorScheme, useColorSchemePreference, type ColorSchemePreference } from '@/lib/color-scheme';
import { sessionQuery, type SessionUser } from '@/lib/session';
import { ROLES } from '@/lib/users';

const NAME_MAX = 100;

const profileSchema = z.object({
  first_name: z.string().trim().min(1, 'Indiquez votre prénom').max(NAME_MAX, `Le prénom ne doit pas dépasser ${NAME_MAX} caractères`),
  last_name: z.string().trim().min(1, 'Indiquez votre nom').max(NAME_MAX, `Le nom ne doit pas dépasser ${NAME_MAX} caractères`),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Indiquez votre mot de passe actuel'),
    password: z.string().min(1, 'Choisissez un nouveau mot de passe').min(MIN_PASSWORD_LENGTH, `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`),
    confirmation: z.string().min(1, 'Confirmez le nouveau mot de passe'),
  })
  .refine((values) => values.password === values.confirmation, {
    path: ['confirmation'],
    message: 'Les deux mots de passe ne sont pas identiques',
    when: (payload) => typeof payload.value === 'object' && payload.value !== null && Boolean((payload.value as { confirmation?: string }).confirmation),
  })
  .refine((values) => !values.currentPassword || values.password !== values.currentPassword, {
    path: ['password'],
    message: "Choisissez un mot de passe différent de l'actuel",
    when: (payload) => typeof payload.value === 'object' && payload.value !== null && Boolean((payload.value as { password?: string }).password),
  });

const summaryTitle = (count: number) => `${count} champ${count > 1 ? 's' : ''} à corriger`;

export function roleDescription(user: Pick<SessionUser, 'municipality_role'>): { label: string; description: string } {
  if (user.municipality_role === 'super_admin') return { label: 'Équipe Communeo', description: 'Accès à toutes les communes et à l’espace de l’équipe.' };
  const role = ROLES.find((entry) => entry.value === user.municipality_role) ?? ROLES[0]!;
  return { label: role.label, description: role.description };
}

export function AccountScreen() {
  const { data: user } = useSuspenseQuery(sessionQuery);
  return (
    <div className="mx-auto max-w-[760px] space-y-5">
      <PageHeader title="Mon compte" />
      <AccountSummary user={user} />
      <RequiredNote />
      <ProfileForm user={user} />
      <PasswordForm user={user} />
      <Preferences />
    </div>
  );
}

function Card({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <h2 id={id} className="text-base font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function AccountSummary({ user }: { user: SessionUser }) {
  const role = roleDescription(user);
  return (
    <Card id="mon-compte-identifiants" title="Connexion et rôle">
      <dl className="space-y-4">
        <div className="sm:grid sm:grid-cols-[160px_1fr] sm:gap-x-6">
          <dt className="font-medium">Adresse e-mail</dt>
          <dd className="mt-0.5 min-w-0 sm:mt-0">
            <span className="break-all">{user.email}</span>
            <p className="mt-1 text-[13px] text-secondary">
              Elle sert à vous connecter et à recevoir les e-mails de Communeo. Pour en changer, contactez l’équipe Communeo.
            </p>
          </dd>
        </div>
        <div className="sm:grid sm:grid-cols-[160px_1fr] sm:gap-x-6">
          <dt className="font-medium">Rôle</dt>
          <dd className="mt-0.5 sm:mt-0">
            {role.label}
            {user.site && user.municipality_role !== 'super_admin' && <> · {user.site.name}</>}
            <p className="mt-1 text-[13px] text-secondary">
              {role.description}
              {user.municipality_role === 'editor' && ' Un administrateur de la commune peut changer votre rôle.'}
            </p>
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function ProfileForm({ user }: { user: SessionUser }) {
  const client = useQueryClient();
  const form = useZodForm(profileSchema, { first_name: user.first_name ?? '', last_name: user.last_name ?? '' });
  const [error, setError] = useState<string | null>(null);
  const dirty = form.formState.isDirty;

  const save = async (values: z.output<typeof profileSchema>): Promise<boolean> => {
    setError(null);
    try {
      const saved = await updateProfile(client, values);
      form.reset({ first_name: saved.first_name, last_name: saved.last_name });
      toast.success('Nom enregistré.');
      return true;
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 400 ? caught.message : "Le nom n'a pas pu être enregistré. Réessayez dans un instant.");
      return false;
    }
  };

  return (
    <Form form={form} onSubmit={save} requiredNote={false} summaryTitle={summaryTitle}>
      <FormSection id="mon-compte-identite" title="Prénom et nom" fields={['first_name', 'last_name']}>
        <p className="-mt-2 text-[13px] text-secondary">Votre nom apparaît dans la liste des utilisateurs et dans le journal d’activité de la commune.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="first_name" label="Prénom" required inputProps={{ autoComplete: 'given-name' }} />
          <TextField name="last_name" label="Nom" required inputProps={{ autoComplete: 'family-name' }} />
        </div>
        {error && <FormError>{error}</FormError>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!dirty || form.formState.isSubmitting}>
            Enregistrer
          </Button>
          {dirty && (
            <Button type="button" variant="secondary" onClick={() => form.reset()}>
              Annuler
            </Button>
          )}
        </div>
      </FormSection>
      <UnsavedChangesGuard when={dirty} onSave={() => new Promise((resolve) => void form.handleSubmit(async (values) => resolve(await save(values)), () => resolve(false))())} />
    </Form>
  );
}

function PasswordForm({ user }: { user: SessionUser }) {
  const form = useZodForm(passwordSchema, { currentPassword: '', password: '', confirmation: '' });
  const [error, setError] = useState<string | null>(null);
  const [reset, setReset] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  const submit = async ({ currentPassword, password }: z.output<typeof passwordSchema>) => {
    setError(null);
    try {
      await changePassword(currentPassword, password);
    } catch (caught) {
      if (caught instanceof ApiError && (caught.details as { field?: string } | undefined)?.field === 'currentPassword') {
        form.setError('currentPassword', { message: caught.message });
      } else {
        setError(caught instanceof ApiError && [400, 429].includes(caught.status) ? caught.message : "Le mot de passe n'a pas pu être changé. Réessayez dans un instant.");
      }
      return;
    }
    form.reset();
    toast.success('Mot de passe changé. Vos autres sessions ont été fermées.');
  };

  const sendReset = async () => {
    setReset('sending');
    try {
      await sendOwnPasswordReset();
      setReset('sent');
    } catch {
      setReset('failed');
    }
  };

  return (
    <Form form={form} onSubmit={submit} requiredNote={false} summaryTitle={summaryTitle}>
      <FormSection id="mon-compte-mot-de-passe" title="Mot de passe" fields={['currentPassword', 'password', 'confirmation']}>
        <p className="-mt-2 text-[13px] text-secondary">Après le changement, vos sessions ouvertes sur d’autres appareils sont fermées.</p>
        {/* Identifiant pour les gestionnaires de mots de passe */}
        <input type="email" name="username" autoComplete="username" value={user.email} readOnly hidden />
        <PasswordField name="currentPassword" label="Mot de passe actuel" required autoComplete="current-password" />
        <PasswordField
          name="password"
          label="Nouveau mot de passe"
          required
          autoComplete="new-password"
          strength
          help={`${MIN_PASSWORD_LENGTH} caractères minimum. Plusieurs mots faciles à retenir font un bon mot de passe.`}
        />
        <PasswordField name="confirmation" label="Confirmer le nouveau mot de passe" required autoComplete="new-password" />
        {error && <FormError>{error}</FormError>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Button type="submit" variant="secondary" disabled={form.formState.isSubmitting}>
            Changer le mot de passe
          </Button>
          {reset !== 'sent' && (
            <Button type="button" variant="tertiary" disabled={reset === 'sending'} onClick={sendReset}>
              Mot de passe actuel oublié ?
            </Button>
          )}
          <p role="status" className="text-[13px] text-success empty:hidden">
            {reset === 'sent' ? `Lien envoyé à ${user.email}, valable 1 heure.` : ''}
          </p>
        </div>
        {reset === 'failed' && <FormError>Le lien n'a pas pu être envoyé. Réessayez dans un instant.</FormError>}
      </FormSection>
    </Form>
  );
}

const SCHEME_HELP: Record<ColorSchemePreference, string> = {
  light: 'Fond clair, en toutes circonstances.',
  dark: 'Fond sombre, plus reposant le soir.',
  system: 'Suit le réglage de l’ordinateur ou du téléphone.',
};

function Preferences() {
  const scheme = useColorSchemePreference();
  return (
    <Card id="mon-compte-preferences" title="Préférences">
      <fieldset aria-describedby="mon-compte-affichage-aide">
        <legend className="font-medium">Affichage</legend>
        <p id="mon-compte-affichage-aide" className="mt-1 text-[13px] text-secondary">
          Appliqué tout de suite et gardé sur cet appareil. Aussi dans le menu de votre compte.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {COLOR_SCHEME_OPTIONS.map((option) => {
            const id = `affichage-${option.value}`;
            return (
              <label
                key={option.value}
                htmlFor={id}
                className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border-input px-3 py-2.5 has-checked:border-2 has-checked:border-brand has-checked:bg-selected-row"
              >
                <input
                  type="radio"
                  id={id}
                  name="affichage"
                  value={option.value}
                  checked={scheme === option.value}
                  onChange={() => setColorScheme(option.value)}
                  aria-describedby={`${id}-desc`}
                  className="mt-0.5 size-[18px] shrink-0 accent-[var(--brand-button)]"
                />
                <span>
                  <span className="font-semibold">{option.label}</span>
                  <span id={`${id}-desc`} className="mt-0.5 block text-[13px] text-secondary">
                    {SCHEME_HELP[option.value]}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </Card>
  );
}

function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex gap-2 text-[13px] text-danger">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}
