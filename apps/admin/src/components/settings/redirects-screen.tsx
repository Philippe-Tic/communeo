/**
 * Redirections depuis l'ancien site de la commune (#335, administrateurs). Les adresses de l'ancien
 * site renvoient vers les pages de ce site : les habitants arrivent au bon endroit, et Google garde le
 * référencement acquis. On colle les anciennes adresses (ou l'adresse du plan du site de l'ancien
 * site) : Communeo propose une page pour chacune ; la commune vérifie, corrige, enregistre. Les
 * redirections partent à la prochaine mise en ligne.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';
import { normalizeOldAddress, type RedirectRule, type RedirectDestination, type RedirectSuggestion } from '@communeo/core';
import { controlClass } from '@/components/form/field';
import { UnsavedChangesGuard } from '@/components/form/unsaved-changes';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { redirectsQuery, saveRedirects, suggestRedirects } from '@/lib/redirects';
import { cn } from '@/lib/utils';

interface Row {
  key: number;
  from: string;
  to: string;
  /** Proposition automatique à vérifier : « probable » ou rien trouvé */
  check: 'probable' | 'choose' | null;
}

let nextKey = 1;
const toRow = (redirect: RedirectRule, check: Row['check'] = null): Row => ({ key: nextKey++, from: redirect.from, to: redirect.to, check });
const failure = (error: unknown) => (error instanceof ApiError ? error.message : 'erreur inattendue');

function DestinationSelect({ id, value, destinations, invalid, describedBy, onChange }: { id: string; value: string; destinations: RedirectDestination[]; invalid: boolean; describedBy?: string; onChange: (value: string) => void }) {
  const groups = useMemo(() => {
    const byKind = new Map<string, RedirectDestination[]>();
    for (const destination of destinations) byKind.set(destination.kind, [...(byKind.get(destination.kind) ?? []), destination]);
    return [...byKind.entries()];
  }, [destinations]);
  return (
    <select
      id={id}
      value={value}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(event) => onChange(event.target.value)}
      className={cn(controlClass, 'h-11 w-full md:h-10', invalid && 'border-danger')}
    >
      <option value="">Choisir une page…</option>
      {groups.map(([kind, items]) => (
        <optgroup key={kind} label={kind}>
          {items.map((destination) => (
            <option key={destination.path} value={destination.path}>
              {destination.label} ({destination.path})
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function ImportForm({ onSuggestions }: { onSuggestions: (suggestions: RedirectSuggestion[], truncated: boolean) => void }) {
  const id = useId();
  const [addresses, setAddresses] = useState('');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!addresses.trim() && !sitemapUrl.trim()) {
      setError("Collez des adresses de l'ancien site, ou l'adresse de son plan du site.");
      document.getElementById(`${id}-adresses`)?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await suggestRedirects({ addresses, sitemapUrl });
      onSuggestions(result.suggestions, result.truncated);
      setAddresses('');
      setSitemapUrl('');
    } catch (caught) {
      setError(failure(caught));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-labelledby={`${id}-titre`} className="space-y-3 rounded-xl border border-border bg-surface p-5 dark:bg-sidebar">
      <div>
        <h2 id={`${id}-titre`} className="text-lg">
          Importer les adresses de l'ancien site
        </h2>
        <p className="mt-1 text-[13px] text-secondary">
          Communeo propose une page pour chacune ; vous vérifiez ensuite la liste. Avant de relier votre domaine à Communeo, l'ancien site est
          encore en ligne : c'est le bon moment pour lire son plan du site.
        </p>
      </div>
      <div>
        <label htmlFor={`${id}-plan`} className="font-medium">
          Adresse du plan du site de l'ancien site <span className="font-normal text-secondary">(facultatif)</span>
        </label>
        <input
          id={`${id}-plan`}
          type="url"
          value={sitemapUrl}
          onChange={(event) => setSitemapUrl(event.target.value)}
          spellCheck={false}
          aria-describedby={`${id}-plan-aide`}
          className={cn(controlClass, 'mt-1.5 h-11 w-full md:h-10')}
        />
        <p id={`${id}-plan-aide`} className="mt-1.5 text-[13px] text-secondary">
          Par exemple https://www.mairie-exemple.fr/sitemap.xml : souvent à l'adresse /sitemap.xml de l'ancien site.
        </p>
      </div>
      <div>
        <label htmlFor={`${id}-adresses`} className="font-medium">
          Ou les adresses, une par ligne <span className="font-normal text-secondary">(facultatif)</span>
        </label>
        <textarea
          id={`${id}-adresses`}
          value={addresses}
          onChange={(event) => {
            setAddresses(event.target.value);
            if (error) setError(null);
          }}
          rows={4}
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-adresses-aide${error ? ` ${id}-erreur` : ''}`}
          className={cn(controlClass, 'mt-1.5 w-full resize-y py-2.5 font-mono text-[13px]')}
        />
        <p id={`${id}-adresses-aide`} className="mt-1.5 text-[13px] text-secondary">
          Adresses complètes ou chemins, par exemple https://www.mairie-exemple.fr/horaires.html ou /index.php?page=etat-civil.
        </p>
      </div>
      {error && (
        <p id={`${id}-erreur`} role="alert" className="flex items-center gap-1.5 text-[13px] font-medium text-danger">
          <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
      <Button type="button" variant="secondary" disabled={busy} onClick={() => void submit()}>
        {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Sparkles aria-hidden="true" />}
        Proposer les redirections
      </Button>
    </section>
  );
}

function Editor({ initial, destinations }: { initial: RedirectRule[]; destinations: RedirectDestination[] }) {
  const client = useQueryClient();
  const id = useId();
  const [saved, setSaved] = useState<RedirectRule[]>(initial);
  const [rows, setRows] = useState<Row[]>(() => initial.map((redirect) => toRow(redirect)));
  const [errors, setErrors] = useState<Record<number, { from?: string; to?: string }>>({});
  const [onlyToCheck, setOnlyToCheck] = useState(false);
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLUListElement>(null);

  const current = rows.map(({ from, to }) => ({ from: from.trim(), to }));
  const dirty = JSON.stringify(current) !== JSON.stringify(saved);
  const toCheck = rows.filter((row) => row.check).length;
  const shown = onlyToCheck ? rows.filter((row) => row.check) : rows;

  const update = (key: number, patch: Partial<Row>) => {
    setRows((all) => all.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setErrors((all) => {
      const { [key]: _removed, ...rest } = all;
      return rest;
    });
  };

  const addSuggestions = (suggestions: RedirectSuggestion[], truncated: boolean) => {
    const known = new Set(rows.map((row) => normalizeOldAddress(row.from) ?? row.from));
    const fresh = suggestions.filter((suggestion) => !known.has(suggestion.from));
    setRows((all) => [
      ...fresh.map((suggestion) =>
        toRow({ from: suggestion.from, to: suggestion.to ?? '' }, suggestion.confidence === 'sure' ? null : suggestion.to ? 'probable' : 'choose'),
      ),
      ...all,
    ]);
    const choose = fresh.filter((suggestion) => !suggestion.to).length;
    toast.success(
      fresh.length
        ? `${fresh.length} adresse${fresh.length > 1 ? 's' : ''} ajoutée${fresh.length > 1 ? 's' : ''}${choose ? `, dont ${choose} sans page proposée` : ''}. Vérifiez la liste, puis enregistrez.${truncated ? ' Seules les 1 000 premières ont été gardées.' : ''}`
        : 'Ces adresses sont déjà dans la liste.',
    );
  };

  const save = async (): Promise<boolean> => {
    const found: Record<number, { from?: string; to?: string }> = {};
    for (const row of rows) {
      const problem: { from?: string; to?: string } = {};
      if (!normalizeOldAddress(row.from)) problem.from = 'Adresse invalide (ni vide, ni la page d’accueil).';
      if (!row.to) problem.to = 'Choisissez une page, ou retirez la ligne.';
      if (problem.from || problem.to) found[row.key] = problem;
    }
    setErrors(found);
    const first = rows.find((row) => found[row.key]);
    if (first) {
      setOnlyToCheck(false);
      requestAnimationFrame(() => document.getElementById(`${id}-${found[first.key]!.from ? 'de' : 'vers'}-${first.key}`)?.focus());
      toast.error(`${Object.keys(found).length} ligne${Object.keys(found).length > 1 ? 's' : ''} à compléter avant d’enregistrer.`);
      return false;
    }
    setBusy(true);
    try {
      const result = await saveRedirects(current);
      setSaved(result);
      setRows(result.map((redirect) => toRow(redirect)));
      void client.invalidateQueries({ queryKey: ['redirections'] });
      toast.success('Redirections enregistrées : elles partiront à la prochaine mise en ligne.');
      return true;
    } catch (caught) {
      toast.error(`Les redirections n'ont pas été enregistrées : ${failure(caught)}`);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <UnsavedChangesGuard when={dirty} onSave={save} />
      <ImportForm onSuggestions={addSuggestions} />

      <section aria-labelledby={`${id}-liste`} className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id={`${id}-liste`} className="text-lg">
              Redirections <span className="font-normal text-secondary">· {rows.length}</span>
            </h2>
            {toCheck > 0 && (
              <p className="text-[13px] text-secondary">
                {toCheck} proposition{toCheck > 1 ? 's' : ''} à vérifier.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {toCheck > 0 && (
              <Button type="button" size="sm" variant="secondary" aria-pressed={onlyToCheck} onClick={() => setOnlyToCheck(!onlyToCheck)}>
                {onlyToCheck ? 'Tout afficher' : 'Seulement celles à vérifier'}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                const row = toRow({ from: '', to: '' });
                setOnlyToCheck(false);
                setRows((all) => [row, ...all]);
                requestAnimationFrame(() => document.getElementById(`${id}-de-${row.key}`)?.focus());
              }}
            >
              <Plus aria-hidden="true" />
              Ajouter une redirection
            </Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-5 text-secondary dark:bg-sidebar">
            Aucune redirection. Si votre commune n'avait pas de site avant Communeo, il n'y a rien à faire ici.
          </p>
        ) : (
          <ul ref={list} className="divide-y divide-border rounded-xl border border-border bg-surface dark:bg-sidebar">
            {shown.map((row, index) => {
              const error = errors[row.key];
              const position = rows.indexOf(row) + 1;
              return (
                <li key={row.key} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start">
                  <div>
                    <label htmlFor={`${id}-de-${row.key}`} className="text-[13px] font-medium">
                      Ancienne adresse<span className="sr-only"> (ligne {position})</span>
                    </label>
                    <input
                      id={`${id}-de-${row.key}`}
                      value={row.from}
                      onChange={(event) => update(row.key, { from: event.target.value })}
                      spellCheck={false}
                      aria-invalid={error?.from ? true : undefined}
                      aria-describedby={error?.from ? `${id}-de-${row.key}-erreur` : undefined}
                      className={cn(controlClass, 'mt-1 h-11 w-full font-mono text-[13px] md:h-10', error?.from && 'border-danger')}
                    />
                    {error?.from && (
                      <p id={`${id}-de-${row.key}-erreur`} className="mt-1 text-[13px] text-danger">
                        {error.from}
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label htmlFor={`${id}-vers-${row.key}`} className="text-[13px] font-medium">
                        Vers la page<span className="sr-only"> (ligne {position})</span>
                      </label>
                      {row.check === 'probable' && <StatusBadge tone="warning">À vérifier</StatusBadge>}
                      {row.check === 'choose' && <StatusBadge tone="info">À choisir</StatusBadge>}
                    </div>
                    <div className="mt-1">
                      <DestinationSelect
                        id={`${id}-vers-${row.key}`}
                        value={row.to}
                        destinations={destinations}
                        invalid={!!error?.to}
                        describedBy={error?.to ? `${id}-vers-${row.key}-erreur` : undefined}
                        onChange={(to) => update(row.key, { to, check: null })}
                      />
                    </div>
                    {error?.to && (
                      <p id={`${id}-vers-${row.key}-erreur`} className="mt-1 text-[13px] text-danger">
                        {error.to}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="md:mt-6"
                    aria-label={`Retirer la redirection ${row.from || `de la ligne ${index + 1}`}`}
                    onClick={() => {
                      setRows((all) => all.filter((item) => item.key !== row.key));
                      requestAnimationFrame(() => list.current?.querySelector<HTMLElement>('input')?.focus());
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" disabled={busy || !dirty} onClick={() => void save()}>
            {busy && <Loader2 aria-hidden="true" className="animate-spin" />}
            Enregistrer les redirections
          </Button>
          {dirty && <p className="text-[13px] text-secondary">Modifications non enregistrées.</p>}
        </div>
      </section>
    </>
  );
}

export function RedirectsScreen() {
  const redirects = useQuery(redirectsQuery);
  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <PageHeader
        title="Redirections"
        description="Les adresses de votre ancien site renvoient vers les pages de ce site : les habitants arrivent au bon endroit, et Google garde votre référencement. Elles partent à la prochaine mise en ligne."
      />
      {redirects.isError ? (
        <div role="alert" className="rounded-xl border border-danger bg-danger-alert-bg p-5">
          Les redirections n'ont pas pu être chargées.{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void redirects.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : !redirects.data ? (
        <div aria-busy="true" className="h-48 animate-pulse rounded-xl bg-neutral-bg" />
      ) : (
        <Editor initial={redirects.data.redirects} destinations={redirects.data.destinations} />
      )}
    </div>
  );
}
