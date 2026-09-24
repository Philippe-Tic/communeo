/**
 * Communes de la plateforme (handoff 6.20) : thème, état de mise en ligne, utilisateurs, dernière
 * activité ; les communes inactives depuis 30 jours sont signalées (signal d'accompagnement).
 * « Entrer dans l'admin » ouvre l'administration de la commune avec le bandeau de l'équipe.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Dialog } from 'radix-ui';
import { Check, CircleAlert, Loader2, Plus, Search } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { slugify, THEMES } from '@communeo/core';
import { controlClass, Form, TextField, useZodForm } from '@/components/form';
import { Button } from '@/components/ui/button';
import { dialogContentClass, useReturnFocus } from '@/components/ui/confirm-dialog';
import { StatusBadge, type Tone } from '@/components/ui/status-badge';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatListDate } from '@/lib/dates';
import {
  communesQuery,
  createCommune,
  enterCommune,
  isInactive,
  PUBLICATION_LABELS,
  refreshCommunes,
  slugAvailable,
  type CommunePublication,
  type CommuneSummary,
} from '@/lib/equipe';
import { focusHeadingIfRequested } from '@/lib/focus';
import { themeName } from '@/lib/session';
import { cn } from '@/lib/utils';
import { z } from 'zod';

const PAGE_SIZE = 20;
const TONES: Record<CommunePublication, Tone> = {
  new: 'neutral',
  running: 'info',
  failed: 'danger',
  pending: 'warning',
  ok: 'success',
};

export const siteAddress = (commune: Pick<CommuneSummary, 'customDomain' | 'liveUrl' | 'slug'>) =>
  commune.customDomain ?? commune.liveUrl?.replace(/^https?:\/\//, '') ?? commune.slug;

export function PublicationBadge({ commune }: { commune: CommuneSummary }) {
  const { state, at, pendingCount } = commune.publication;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <StatusBadge tone={TONES[state]}>{PUBLICATION_LABELS[state]}</StatusBadge>
      <span className="text-[12px] text-secondary">
        {state === 'pending'
          ? `${pendingCount} modif${pendingCount > 1 ? 's' : ''}`
          : at
            ? formatListDate(new Date(at)).toLowerCase()
            : ''}
      </span>
    </span>
  );
}

// --- Création -------------------------------------------------------------------------------------

const createSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Indiquez le nom de la commune')
    .max(100, 'Le nom ne doit pas dépasser 100 caractères'),
  slug: z
    .string()
    .trim()
    .min(1, "Indiquez l'adresse du site")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Lettres minuscules, chiffres et tirets seulement'),
  admin_first_name: z.string().trim().min(1, 'Indiquez le prénom'),
  admin_last_name: z.string().trim().min(1, 'Indiquez le nom'),
  admin_email: z.string().trim().min(1, "Indiquez l'e-mail").pipe(z.email("L'adresse e-mail n'est pas valide")),
});

function CreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const returnFocus = useReturnFocus();
  const empty = { name: '', slug: '', admin_first_name: '', admin_last_name: '', admin_email: '' };
  const form = useZodForm(createSchema, empty);
  const [error, setError] = useState<string | null>(null);
  const slugTouched = useRef(false);
  const name = form.watch('name');
  const slug = form.watch('slug');
  const [availability, setAvailability] = useState<{ slug: string; available: boolean; reason?: string } | null>(null);

  useEffect(() => {
    if (open) {
      form.reset(empty);
      slugTouched.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- à chaque ouverture seulement
  }, [open]);
  // Adresse proposée depuis le nom tant qu'on ne l'a pas modifiée
  useEffect(() => {
    if (!slugTouched.current) form.setValue('slug', slugify(name));
  }, [name, form]);
  // Disponibilité vérifiée après une courte pause de frappe
  useEffect(() => {
    if (!slug) return;
    const timer = setTimeout(() => {
      void slugAvailable(slug)
        .then((result) => setAvailability({ slug, ...result }))
        .catch(() => undefined);
    }, 350);
    return () => clearTimeout(timer);
  }, [slug]);
  const current = availability?.slug === slug ? availability : null;

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
          <Dialog.Title className="text-[17px] font-semibold">Créer une commune</Dialog.Title>
          <Dialog.Description className="mt-1 text-secondary">
            Le premier administrateur recevra une invitation et démarrera l'assistant de création.
          </Dialog.Description>
          <Form
            form={form}
            className="mt-4 space-y-4"
            summaryTitle={(count) => `${count} champ${count > 1 ? 's' : ''} à compléter`}
            onSubmit={async (values) => {
              setError(null);
              try {
                const { data } = await createCommune(values);
                void refreshCommunes(client);
                toast.success(`${values.name} est créée. Invitation envoyée à ${values.admin_email}.`);
                close(false);
                await navigate({ to: '/plateforme/communes/$documentId', params: { documentId: data.documentId } });
              } catch (caught) {
                setError(
                  `La commune n'a pas été créée : ${caught instanceof ApiError ? caught.message : 'erreur inattendue'}`,
                );
              }
            }}
          >
            <TextField name="name" label="Nom de la commune" required inputProps={{ autoComplete: 'off' }} />
            <div>
              <TextField
                name="slug"
                label="Adresse du site"
                required
                help="Identifiant de la commune dans l'adresse provisoire du site ; un domaine personnalisé pourra être ajouté ensuite."
                inputProps={{ autoComplete: 'off', spellCheck: false, onInput: () => (slugTouched.current = true) }}
              />
              {slug && current && (
                <p
                  role="status"
                  className={cn(
                    'mt-1 flex items-center gap-1.5 text-[13px] font-medium',
                    current.available ? 'text-success' : 'text-danger',
                  )}
                >
                  {current.available ? (
                    <Check aria-hidden="true" className="size-3.5" />
                  ) : (
                    <CircleAlert aria-hidden="true" className="size-3.5" />
                  )}
                  {current.available ? 'Disponible' : current.reason}
                </p>
              )}
            </div>
            <fieldset className="grid gap-4 rounded-lg border border-border p-3">
              <legend className="px-1 font-medium">Premier administrateur</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField name="admin_first_name" label="Prénom" required inputProps={{ autoComplete: 'off' }} />
                <TextField name="admin_last_name" label="Nom" required inputProps={{ autoComplete: 'off' }} />
              </div>
              <TextField
                name="admin_email"
                label="E-mail"
                required
                inputProps={{ type: 'email', autoComplete: 'off' }}
              />
            </fieldset>
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
              <Button type="submit" disabled={form.formState.isSubmitting || current?.available === false}>
                {form.formState.isSubmitting && <Loader2 aria-hidden="true" className="animate-spin" />}
                Créer et inviter
              </Button>
            </div>
          </Form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// --- Liste ----------------------------------------------------------------------------------------

export function CommunesScreen() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const communes = useQuery(communesQuery);
  const heading = useRef<HTMLHeadingElement>(null);
  const searchId = useId();
  const [q, setQ] = useState('');
  const [theme, setTheme] = useState('');
  const [state, setState] = useState<CommunePublication | ''>('');
  const [inactiveOnly, setInactiveOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  useEffect(() => focusHeadingIfRequested(heading.current), []);
  useEffect(() => {
    document.title = 'Communes · Équipe Communeo';
  }, []);

  const all = communes.data ?? [];
  const needle = q.trim().toLocaleLowerCase('fr');
  const shown = all
    .filter(
      (commune) =>
        !needle || commune.name.toLocaleLowerCase('fr').includes(needle) || siteAddress(commune).includes(needle),
    )
    .filter((commune) => !theme || commune.theme === theme)
    .filter((commune) => !state || commune.publication.state === state)
    .filter((commune) => !inactiveOnly || isInactive(commune))
    .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const visible = shown.slice((Math.min(page, pages) - 1) * PAGE_SIZE, Math.min(page, pages) * PAGE_SIZE);
  const inactiveCount = all.filter((commune) => isInactive(commune)).length;
  const online = all.filter((commune) => commune.publication.state !== 'new').length;

  const enter = async (commune: CommuneSummary) => {
    enterCommune(client, commune.documentId);
    await navigate({ to: '/' });
  };

  const select = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: Array<{ value: string; label: string }>,
  ) => (
    <label className="flex items-center gap-2 text-[13px]">
      <span className="font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setPage(1);
        }}
        className={cn(controlClass, 'h-11 w-auto md:h-9')}
      >
        <option value="">Tous</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 ref={heading} className="outline-none">
            Communes
          </h1>
          {communes.data && (
            <p className="mt-1 text-secondary">
              {all.length} commune{all.length > 1 ? 's' : ''} · {online} site{online > 1 ? 's' : ''} en ligne ·{' '}
              {all.length - online} en création
            </p>
          )}
        </div>
        <Button type="button" className="max-md:h-11" onClick={() => setCreating(true)}>
          <Plus aria-hidden="true" />
          Créer une commune
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-60">
          <label htmlFor={searchId} className="sr-only">
            Rechercher une commune
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-secondary"
          />
          <input
            id={searchId}
            type="search"
            placeholder="Rechercher une commune"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setPage(1);
            }}
            className={cn(controlClass, 'h-11 pl-9 md:h-9')}
          />
        </div>
        {select(
          'Thème',
          theme,
          setTheme,
          THEMES.map((entry) => ({ value: entry.id, label: entry.name })),
        )}
        {select(
          'État',
          state,
          (value) => setState(value as CommunePublication | ''),
          Object.entries(PUBLICATION_LABELS).map(([value, label]) => ({ value, label })),
        )}
        <Button
          type="button"
          variant={inactiveOnly ? 'primary' : 'secondary'}
          aria-pressed={inactiveOnly}
          className="max-md:h-11"
          onClick={() => {
            setInactiveOnly((value) => !value);
            setPage(1);
          }}
        >
          Inactives depuis 30 jours · {inactiveCount}
        </Button>
      </div>

      {communes.isError ? (
        <div role="alert" className="rounded-xl border border-danger bg-danger-alert-bg p-5">
          La liste des communes n'a pas pu être chargée.{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void communes.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : !communes.data ? (
        <div aria-busy="true" className="h-64 animate-pulse rounded-xl bg-neutral-bg" />
      ) : (
        <section aria-label="Liste des communes" className="rounded-xl border border-border bg-surface dark:bg-sidebar">
          <p role="status" className="sr-only">
            {shown.length} commune{shown.length > 1 ? 's' : ''}
          </p>
          {shown.length === 0 ? (
            <p className="p-5 text-secondary">Aucune commune ne correspond.</p>
          ) : (
            <>
              <table className="w-full text-[13px] max-lg:hidden">
                <caption className="sr-only">Communes, triées par dernière activité</caption>
                <thead>
                  <tr className="text-left text-[11px] tracking-[0.06em] text-secondary uppercase">
                    <th scope="col" className="px-5 py-2.5 font-semibold">
                      Commune
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Thème
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Mise en ligne
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Utilisateurs
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Dernière activité
                    </th>
                    <th scope="col" className="px-5 py-2.5">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((commune) => (
                    <tr key={commune.documentId} className="border-t border-border">
                      <td className="px-5 py-3">
                        <Link
                          to="/plateforme/communes/$documentId"
                          params={{ documentId: commune.documentId }}
                          className="font-semibold hover:underline"
                        >
                          {commune.name}
                        </Link>
                        {commune.suspended && (
                          <StatusBadge tone="danger" className="ml-2">
                            Suspendue
                          </StatusBadge>
                        )}
                        <p className="text-secondary">
                          {siteAddress(commune)}
                          {commune.population != null && ` · ${commune.population.toLocaleString('fr-FR')} hab.`}
                        </p>
                      </td>
                      <td className="px-3 py-3">{themeName(commune.theme)}</td>
                      <td className="px-3 py-3">
                        <PublicationBadge commune={commune} />
                      </td>
                      <td className="px-3 py-3">
                        {commune.users.active}
                        {commune.users.invited > 0 && (
                          <span className="text-secondary">
                            {' '}
                            + {commune.users.invited} invité{commune.users.invited > 1 ? 's' : ''}
                          </span>
                        )}
                      </td>
                      <td className={cn('px-3 py-3', isInactive(commune) && 'font-semibold text-warning')}>
                        {formatListDate(new Date(commune.lastActivity))}
                        {isInactive(commune) && (
                          <span className="block font-normal">Inactive depuis plus de 30 jours</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          aria-label={`Entrer dans l'administration de ${commune.name}`}
                          onClick={() => void enter(commune)}
                        >
                          Entrer dans l'admin
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="divide-y divide-border lg:hidden">
                {visible.map((commune) => (
                  <li key={commune.documentId} className="space-y-2 p-4">
                    <div>
                      <Link
                        to="/plateforme/communes/$documentId"
                        params={{ documentId: commune.documentId }}
                        className="font-semibold hover:underline"
                      >
                        {commune.name}
                      </Link>
                      {commune.suspended && (
                        <StatusBadge tone="danger" className="ml-2">
                          Suspendue
                        </StatusBadge>
                      )}
                      <p className="text-[13px] text-secondary">{siteAddress(commune)}</p>
                    </div>
                    <PublicationBadge commune={commune} />
                    <p
                      className={cn(
                        'text-[13px]',
                        isInactive(commune) ? 'font-semibold text-warning' : 'text-secondary',
                      )}
                    >
                      {themeName(commune.theme)} · {commune.users.active} utilisateur
                      {commune.users.active > 1 ? 's' : ''}
                      {commune.users.invited > 0 &&
                        ` + ${commune.users.invited} invité${commune.users.invited > 1 ? 's' : ''}`}{' '}
                      · {formatListDate(new Date(commune.lastActivity)).toLowerCase()}
                      {isInactive(commune) && ' · inactive depuis plus de 30 jours'}
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-11 w-full"
                      aria-label={`Entrer dans l'administration de ${commune.name}`}
                      onClick={() => void enter(commune)}
                    >
                      Entrer dans l'admin
                    </Button>
                  </li>
                ))}
              </ul>
              {pages > 1 && (
                <nav
                  aria-label="Pages"
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-[13px]"
                >
                  <p className="text-secondary">
                    {(Math.min(page, pages) - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, shown.length)} sur{' '}
                    {shown.length}
                  </p>
                  <div className="flex gap-1">
                    {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
                      <Button
                        key={number}
                        type="button"
                        size="sm"
                        variant={number === page ? 'primary' : 'ghost'}
                        aria-current={number === page ? 'page' : undefined}
                        onClick={() => setPage(number)}
                      >
                        {number}
                      </Button>
                    ))}
                  </div>
                </nav>
              )}
            </>
          )}
        </section>
      )}

      <CreateDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
