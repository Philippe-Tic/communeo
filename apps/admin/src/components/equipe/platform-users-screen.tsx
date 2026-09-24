/**
 * Utilisateurs de toute la plateforme (espace de l'équipe Communeo) : qui a accès à quelle commune,
 * avec quel rôle, et où en est son compte. Pour agir sur un compte, on ouvre la fiche de sa commune
 * (renvoi d'invitation) ou on entre dans l'administration de la commune.
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { controlClass } from '@/components/form';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatListDate } from '@/lib/dates';
import { platformUsersQuery, type PlatformUser } from '@/lib/equipe';
import { focusHeadingIfRequested } from '@/lib/focus';
import { fullName, roleLabel, stateOf, type UserState } from '@/lib/users';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;
const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'editor', label: 'Éditeur' },
  { value: 'super_admin', label: 'Équipe Communeo' },
];
const STATE_OPTIONS: Array<{ value: UserState; label: string }> = [
  { value: 'active', label: 'Actif' },
  { value: 'invited', label: 'Invitation en attente' },
  { value: 'disabled', label: 'Désactivé' },
];

function StateBadge({ user }: { user: PlatformUser }) {
  const state = stateOf(user);
  if (state === 'invited') return <StatusBadge tone="warning">Invitation en attente</StatusBadge>;
  if (state === 'disabled') return <StatusBadge tone="neutral">Désactivé</StatusBadge>;
  return <StatusBadge tone="success">Actif</StatusBadge>;
}

function Commune({ user }: { user: PlatformUser }) {
  if (!user.site)
    return <span className="text-secondary">{user.municipality_role === 'super_admin' ? 'Toutes' : '—'}</span>;
  return (
    <Link
      to="/plateforme/communes/$documentId"
      params={{ documentId: user.site.documentId }}
      className="font-medium text-brand hover:underline"
    >
      {user.site.name}
    </Link>
  );
}

export function PlatformUsersScreen() {
  const users = useQuery(platformUsersQuery);
  const heading = useRef<HTMLHeadingElement>(null);
  const searchId = useId();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [state, setState] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => focusHeadingIfRequested(heading.current), []);
  useEffect(() => {
    document.title = 'Utilisateurs · Équipe Communeo';
  }, []);

  const all = users.data ?? [];
  const needle = q.trim().toLocaleLowerCase('fr');
  const shown = all
    .filter(
      (user) =>
        !needle ||
        [fullName(user), user.email, user.site?.name ?? ''].some((text) =>
          text.toLocaleLowerCase('fr').includes(needle),
        ),
    )
    .filter((user) => !role || user.municipality_role === role)
    .filter((user) => !state || stateOf(user) === state)
    .sort(
      (a, b) =>
        (a.site?.name ?? '').localeCompare(b.site?.name ?? '', 'fr') || fullName(a).localeCompare(fullName(b), 'fr'),
    );
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const active = all.filter((user) => stateOf(user) === 'active').length;
  const invited = all.filter((user) => stateOf(user) === 'invited').length;

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
      <div>
        <h1 ref={heading} className="outline-none">
          Utilisateurs
        </h1>
        {users.data && (
          <p className="mt-1 text-secondary">
            {active} compte{active > 1 ? 's' : ''} actif{active > 1 ? 's' : ''} · {invited} invitation
            {invited > 1 ? 's' : ''} en attente
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-60">
          <label htmlFor={searchId} className="sr-only">
            Rechercher un utilisateur
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-secondary"
          />
          <input
            id={searchId}
            type="search"
            placeholder="Nom, e-mail ou commune"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setPage(1);
            }}
            className={cn(controlClass, 'h-11 pl-9 md:h-9')}
          />
        </div>
        {select('Rôle', role, setRole, ROLE_OPTIONS)}
        {select('État', state, setState, STATE_OPTIONS)}
      </div>

      {users.isError ? (
        <div role="alert" className="rounded-xl border border-danger bg-danger-alert-bg p-5">
          La liste des utilisateurs n'a pas pu être chargée.{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void users.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : !users.data ? (
        <div aria-busy="true" className="h-64 animate-pulse rounded-xl bg-neutral-bg" />
      ) : (
        <section
          aria-label="Liste des utilisateurs"
          className="rounded-xl border border-border bg-surface dark:bg-sidebar"
        >
          <p role="status" className="sr-only">
            {shown.length} utilisateur{shown.length > 1 ? 's' : ''}
          </p>
          {shown.length === 0 ? (
            <p className="p-5 text-secondary">Aucun utilisateur ne correspond.</p>
          ) : (
            <>
              <table className="w-full text-[13px] max-lg:hidden">
                <caption className="sr-only">Utilisateurs, triés par commune</caption>
                <thead>
                  <tr className="text-left text-[11px] tracking-[0.06em] text-secondary uppercase">
                    <th scope="col" className="px-5 py-2.5 font-semibold">
                      Utilisateur
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Commune
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Rôle
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      État
                    </th>
                    <th scope="col" className="px-5 py-2.5 font-semibold">
                      Créé le
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((user) => (
                    <tr key={user.id} className="border-t border-border">
                      <td className="px-5 py-3">
                        <p className="font-semibold">{fullName(user)}</p>
                        <p className="text-secondary">{user.email}</p>
                      </td>
                      <td className="px-3 py-3">
                        <Commune user={user} />
                      </td>
                      <td className="px-3 py-3">{roleLabel(user.municipality_role)}</td>
                      <td className="px-3 py-3">
                        <StateBadge user={user} />
                      </td>
                      <td className="px-5 py-3 text-secondary">{formatListDate(new Date(user.createdAt))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="divide-y divide-border lg:hidden">
                {visible.map((user) => (
                  <li key={user.id} className="space-y-1.5 p-4 text-[13px]">
                    <p className="text-[15px] font-semibold">{fullName(user)}</p>
                    <p className="break-all text-secondary">{user.email}</p>
                    <p>
                      <Commune user={user} /> · {roleLabel(user.municipality_role)}
                    </p>
                    <StateBadge user={user} />
                  </li>
                ))}
              </ul>
              {pages > 1 && (
                <nav
                  aria-label="Pages"
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-[13px]"
                >
                  <p className="text-secondary">
                    {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, shown.length)} sur {shown.length}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
                      <Button
                        key={number}
                        type="button"
                        size="sm"
                        variant={number === current ? 'primary' : 'ghost'}
                        aria-current={number === current ? 'page' : undefined}
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
    </div>
  );
}
