/**
 * Utilisateurs (handoff 6.16, ticket #146, administrateurs) : une ligne par personne, l'état en
 * badge avec libellé ; l'invitation explique les deux rôles à l'endroit du choix ; le menu ⋯ porte
 * les actions, « Supprimer » séparé et en rouge. Garde-fous côté serveur : pas soi-même, toujours
 * un administrateur actif, jamais le rôle super_admin.
 */
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Dialog } from 'radix-ui';
import { MoreHorizontal, UserPlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { Form, RadioGroupField, TextField, useZodForm } from '@/components/form';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, dialogContentClass, useReturnFocus } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatListDate } from '@/lib/dates';
import { focusHeadingIfRequested } from '@/lib/focus';
import { sessionQuery } from '@/lib/session';
import {
  deleteUser,
  fullName,
  inviteUser,
  refreshUsers,
  resendInvitation,
  roleLabel,
  ROLES,
  sendPasswordReset,
  stateOf,
  updateUser,
  usersQuery,
  type CommuneUser,
  type Role,
} from '@/lib/users';
import { cn } from '@/lib/utils';

const failure = (error: unknown) => (error instanceof ApiError ? error.message : 'erreur inattendue');

function initials(user: CommuneUser) {
  const letters = [user.first_name, user.last_name].filter(Boolean).map((part) => part!.trim().charAt(0));
  return (letters.join('') || user.email.charAt(0)).toUpperCase();
}

function StateBadge({ user }: { user: CommuneUser }) {
  const state = stateOf(user);
  if (state === 'disabled') return <StatusBadge tone="neutral">Désactivé</StatusBadge>;
  if (state === 'invited') return <StatusBadge tone="warning">Invitation en attente</StatusBadge>;
  return <StatusBadge tone="success">Actif</StatusBadge>;
}

// --- Invitation ------------------------------------------------------------------------------------

const inviteSchema = z.object({
  first_name: z.string().trim().min(1, 'Indiquez le prénom').max(100, 'Le prénom ne doit pas dépasser 100 caractères'),
  last_name: z.string().trim().min(1, 'Indiquez le nom').max(100, 'Le nom ne doit pas dépasser 100 caractères'),
  email: z.string().trim().min(1, "Indiquez l'adresse e-mail").pipe(z.email("L'adresse e-mail n'est pas valide")),
  role: z.enum(['editor', 'admin']),
});

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const client = useQueryClient();
  const returnFocus = useReturnFocus();
  const form = useZodForm(inviteSchema, { first_name: '', last_name: '', email: '', role: 'editor' });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) form.reset({ first_name: '', last_name: '', email: '', role: 'editor' });
  }, [open, form]);
  const close = (value: boolean) => {
    if (!value) setError(null);
    onOpenChange(value);
  };
  return (
    <Dialog.Root open={open} onOpenChange={close}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content
          {...returnFocus}
          className={cn(dialogContentClass, 'max-h-[calc(100dvh-32px)] max-w-[560px] overflow-y-auto')}
        >
          <Dialog.Title className="text-[17px] font-semibold">Inviter un utilisateur</Dialog.Title>
          <Dialog.Description className="mt-1 text-secondary">
            La personne recevra un lien pour choisir son mot de passe, valable 7 jours.
          </Dialog.Description>
          <Form
            form={form}
            className="mt-4 space-y-4"
            summaryTitle={(count) => `${count} champ${count > 1 ? 's' : ''} à compléter`}
            onSubmit={async (values) => {
              setError(null);
              try {
                await inviteUser({ ...values, role: values.role as Role });
                void refreshUsers(client);
                toast.success(`Invitation envoyée à ${values.email.trim()}.`);
                close(false);
              } catch (caught) {
                setError(`L'invitation n'a pas été envoyée : ${failure(caught)}`);
              }
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="first_name" label="Prénom" required inputProps={{ autoComplete: 'off' }} />
              <TextField name="last_name" label="Nom" required inputProps={{ autoComplete: 'off' }} />
            </div>
            <TextField name="email" label="E-mail" required inputProps={{ type: 'email', autoComplete: 'off' }} />
            <RadioGroupField name="role" label="Rôle" required cards options={ROLES} />
            {error && (
              <p role="alert" className="text-[13px] font-medium text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary">
                  Annuler
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Envoyer l'invitation
              </Button>
            </div>
          </Form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// --- Rôle ------------------------------------------------------------------------------------------

function RoleDialog({ user, onOpenChange }: { user: CommuneUser | null; onOpenChange: (open: boolean) => void }) {
  const client = useQueryClient();
  const returnFocus = useReturnFocus();
  const form = useZodForm(z.object({ role: z.enum(['editor', 'admin']) }), { role: 'editor' });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (user) form.reset({ role: user.municipality_role === 'admin' ? 'admin' : 'editor' });
  }, [user, form]);
  const close = (value: boolean) => {
    if (!value) setError(null);
    onOpenChange(value);
  };
  return (
    <Dialog.Root open={!!user} onOpenChange={close}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content
          {...returnFocus}
          className={cn(dialogContentClass, 'max-h-[calc(100dvh-32px)] max-w-[560px] overflow-y-auto')}
        >
          <Dialog.Title className="text-[17px] font-semibold">Rôle de {user ? fullName(user) : ''}</Dialog.Title>
          <Dialog.Description className="mt-1 text-secondary">
            Le changement s'applique dès sa prochaine action.
          </Dialog.Description>
          <Form
            form={form}
            requiredNote={false}
            className="mt-4 space-y-4"
            onSubmit={async ({ role }) => {
              if (!user) return;
              setError(null);
              try {
                await updateUser(user.id, { municipality_role: role as Role });
                void refreshUsers(client);
                toast.success(`${fullName(user)} est maintenant ${roleLabel(role as Role).toLowerCase()}.`);
                close(false);
              } catch (caught) {
                setError(`Le rôle n'a pas été changé : ${failure(caught)}`);
              }
            }}
          >
            <RadioGroupField name="role" label="Rôle" hideOptional cards options={ROLES} />
            {error && (
              <p role="alert" className="text-[13px] font-medium text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary">
                  Annuler
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Enregistrer le rôle
              </Button>
            </div>
          </Form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// --- Actions ---------------------------------------------------------------------------------------

type Pending = { kind: 'disable' | 'delete'; user: CommuneUser } | null;

function UserActions({
  user,
  onRole,
  onConfirm,
}: {
  user: CommuneUser;
  onRole: () => void;
  onConfirm: (pending: Pending) => void;
}) {
  const client = useQueryClient();
  const state = stateOf(user);
  const name = fullName(user);
  const run = async (action: () => Promise<unknown>, success: string, error: string) => {
    try {
      await action();
      void refreshUsers(client);
      toast.success(success);
    } catch (caught) {
      toast.error(`${error} : ${failure(caught)}`);
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={`Actions pour ${name}`}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {state === 'invited' && (
          <DropdownMenuItem
            onSelect={() =>
              void run(
                () => resendInvitation(user.id),
                `Nouvelle invitation envoyée à ${user.email}.`,
                "L'invitation n'a pas été renvoyée",
              )
            }
          >
            Renvoyer l'invitation
          </DropdownMenuItem>
        )}
        {state === 'active' && (
          <DropdownMenuItem
            onSelect={() =>
              void run(
                () => sendPasswordReset(user.id),
                `Lien de réinitialisation envoyé à ${user.email}.`,
                "Le lien n'a pas été envoyé",
              )
            }
          >
            Réinitialiser le mot de passe
          </DropdownMenuItem>
        )}
        {state !== 'disabled' && <DropdownMenuItem onSelect={onRole}>Changer le rôle…</DropdownMenuItem>}
        {state === 'disabled' ? (
          <DropdownMenuItem
            onSelect={() =>
              void run(
                () => updateUser(user.id, { active: true }),
                `${name} peut de nouveau se connecter.`,
                "Le compte n'a pas été réactivé",
              )
            }
          >
            Réactiver
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => onConfirm({ kind: 'disable', user })}>Désactiver…</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => onConfirm({ kind: 'delete', user })}>
          Supprimer…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Person({ user, me }: { user: CommuneUser; me: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand"
      >
        {initials(user)}
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold">
          {fullName(user)}
          {me && <span className="font-normal text-secondary"> (vous)</span>}
        </p>
        <p className="truncate text-[13px] text-secondary">{user.email}</p>
      </div>
    </div>
  );
}

export function UsersScreen() {
  const client = useQueryClient();
  const { data: session } = useSuspenseQuery(sessionQuery);
  const users = useQuery(usersQuery);
  const [inviting, setInviting] = useState(false);
  const [role, setRole] = useState<CommuneUser | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => focusHeadingIfRequested(heading.current), []);
  useEffect(() => {
    document.title = 'Utilisateurs · Communeo';
  }, []);

  const list = users.data ?? [];
  const invited = list.filter((user) => stateOf(user) === 'invited').length;
  const accounts = list.length - invited;

  return (
    <div className="mx-auto max-w-[960px] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 ref={heading} className="outline-none">
            Utilisateurs
          </h1>
          {users.data && (
            <p className="mt-1 text-secondary">
              {accounts} compte{accounts > 1 ? 's' : ''}
              {invited > 0 && ` · ${invited} invitation${invited > 1 ? 's' : ''} en attente`}
            </p>
          )}
        </div>
        <Button type="button" className="max-md:h-11" onClick={() => setInviting(true)}>
          <UserPlus aria-hidden="true" />
          Inviter un utilisateur
        </Button>
      </div>

      {users.isError ? (
        <div role="alert" className="rounded-xl border border-danger bg-danger-alert-bg p-5">
          La liste des utilisateurs n'a pas pu être chargée.{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void users.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : !users.data ? (
        <div aria-busy="true" className="h-48 animate-pulse rounded-xl bg-neutral-bg" />
      ) : (
        <section
          aria-label="Comptes de la commune"
          className="rounded-xl border border-border bg-surface dark:bg-sidebar"
        >
          {/* Ordinateur : tableau ; mobile : une carte par personne */}
          <table className="w-full text-[13px] max-md:hidden">
            <thead>
              <tr className="text-left text-[11px] tracking-[0.06em] text-secondary uppercase">
                <th scope="col" className="px-5 py-2.5 font-semibold">
                  Nom
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Rôle
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  État
                </th>
                <th scope="col" className="w-14 px-3 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((user) => (
                <tr
                  key={user.id}
                  className={cn('border-t border-border', stateOf(user) === 'disabled' && 'text-secondary')}
                >
                  <td className="px-5 py-3">
                    <Person user={user} me={user.id === session.id} />
                  </td>
                  <td className="px-3 py-3">{roleLabel(user.municipality_role)}</td>
                  <td className="px-3 py-3">
                    <StateBadge user={user} />
                    {stateOf(user) === 'invited' && (
                      <p className="mt-1 text-[12px] text-secondary">
                        Envoyée {formatListDate(new Date(user.createdAt)).toLowerCase()}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {user.id !== session.id && (
                      <UserActions user={user} onRole={() => setRole(user)} onConfirm={setPending} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-border md:hidden">
            {list.map((user) => (
              <li key={user.id} className="flex items-start gap-2 p-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <Person user={user} me={user.id === session.id} />
                  <p className="flex flex-wrap items-center gap-2 text-[13px]">
                    {roleLabel(user.municipality_role)}
                    <StateBadge user={user} />
                  </p>
                </div>
                {user.id !== session.id && (
                  <UserActions user={user} onRole={() => setRole(user)} onConfirm={setPending} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <InviteDialog open={inviting} onOpenChange={setInviting} />
      <RoleDialog user={role} onOpenChange={(open) => !open && setRole(null)} />
      <ConfirmDialog
        open={pending?.kind === 'disable'}
        onOpenChange={(open) => !open && setPending(null)}
        tone="warning"
        title={`Désactiver le compte de ${pending ? fullName(pending.user) : ''} ?`}
        description="La personne ne pourra plus se connecter ; si elle est connectée, elle est déconnectée tout de suite. Ses contenus restent en place, et le compte peut être réactivé."
        confirmLabel="Désactiver le compte"
        onConfirm={async () => {
          try {
            await updateUser(pending!.user.id, { active: false });
          } catch (caught) {
            throw new Error(`Le compte n'a pas été désactivé : ${failure(caught)}`);
          }
          void refreshUsers(client);
          toast.success(`Le compte de ${fullName(pending!.user)} est désactivé.`);
        }}
      />
      <ConfirmDialog
        open={pending?.kind === 'delete'}
        onOpenChange={(open) => !open && setPending(null)}
        title={`Supprimer le compte de ${pending ? fullName(pending.user) : ''} ?`}
        description="Le compte est supprimé définitivement. Ses contenus restent en place. Pour suspendre l'accès sans supprimer, désactivez plutôt le compte."
        confirmLabel="Supprimer le compte"
        onConfirm={async () => {
          try {
            await deleteUser(pending!.user.id);
          } catch (caught) {
            throw new Error(`Le compte n'a pas été supprimé : ${failure(caught)}`);
          }
          void refreshUsers(client);
          toast.success(`Le compte de ${fullName(pending!.user)} est supprimé.`);
        }}
      />
    </div>
  );
}
