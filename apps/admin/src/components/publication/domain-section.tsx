/**
 * Domaine personnalisé (handoff 6.12, administrateurs seulement) : quatre étapes toujours visibles
 * (votre domaine, configuration DNS, vérification, HTTPS). Enregistrements DNS de l'hébergeur dans un
 * tableau, une copie par valeur (ils partent souvent par e-mail à un prestataire) ; vérification
 * manuelle avec la date du dernier essai ; en échec, ce qui est attendu et ce qui est trouvé.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CircleAlert, Copy, ExternalLink, Loader2, Lock, Mail } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { localStorageGet, localStorageSet } from '@/components/editor/preview-panel';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from '@/components/ui/toast';
import { controlClass } from '@/components/form';
import { ApiError } from '@/lib/api';
import { formatListDate, relativeTime } from '@/lib/dates';
import {
  configureDomain,
  DOMAIN_FORMAT,
  domainQuery,
  normalizeDomain,
  removeDomain,
  verifyDomain,
  type DnsRecord,
  type DomainMismatch,
  type DomainStatus,
} from '@/lib/domain';
import { publicationQuery } from '@/lib/publication';
import { sessionQuery } from '@/lib/session';
import { cn } from '@/lib/utils';

const STEPS = ['Votre domaine', 'Configuration DNS', 'Vérification', 'HTTPS'];

function Steps({ current, done }: { current: number; done: number }) {
  return (
    <ol className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4" aria-label="Étapes du domaine personnalisé">
      {STEPS.map((label, index) => {
        const complete = index < done;
        const active = index === current;
        return (
          <li key={label} aria-current={active ? 'step' : undefined} className="text-[12px]">
            <span className={cn('mb-1.5 block h-1 rounded-full', complete || active ? 'bg-brand' : 'bg-border')} />
            <span className={cn(active ? 'font-semibold text-text' : complete ? 'text-text' : 'text-secondary')}>
              {index + 1} {label}
            </span>
            <span className="sr-only">{complete ? ' : terminée' : active ? ' : en cours' : ' : à venir'}</span>
          </li>
        );
      })}
    </ol>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="icon"
      size="icon"
      className="size-9"
      aria-label={copied ? `${label} copiée` : `Copier ${label.toLowerCase()}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("La copie n'a pas fonctionné : sélectionnez la valeur et copiez-la à la main.");
        }
      }}
    >
      {copied ? <Check aria-hidden="true" className="text-success" /> : <Copy aria-hidden="true" />}
    </Button>
  );
}

function DnsTable({ records }: { records: DnsRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <caption className="sr-only">Enregistrements DNS à créer</caption>
        <thead>
          <tr className="text-left text-[11px] tracking-[0.06em] text-secondary uppercase">
            <th scope="col" className="py-2 pr-3 font-semibold">
              Type
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              Nom
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              Valeur
            </th>
            <th scope="col" className="w-12 py-2">
              <span className="sr-only">Copier</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={`${record.type}-${record.name}`} className="border-t border-border">
              <td className="py-2 pr-3 font-semibold">{record.type}</td>
              <td className="py-2 pr-3 font-mono">{record.displayName}</td>
              <td className="py-2 pr-3 font-mono break-all">{record.value}</td>
              <td className="py-1">
                <CopyButton value={record.value} label={`Valeur ${record.type} ${record.displayName}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function mailto(domain: string, records: DnsRecord[]) {
  const lines = records.map((record) => `${record.type}\t${record.displayName}\t${record.value}`).join('\n');
  const body = `Bonjour,\n\nPour que le site de la mairie s'affiche sur ${domain}, merci de créer ces enregistrements DNS :\n\nType\tNom\tValeur\n${lines}\n\nMerci !`;
  return `mailto:?subject=${encodeURIComponent(`Configuration DNS de ${domain}`)}&body=${encodeURIComponent(body)}`;
}

function Mismatch({ mismatch }: { mismatch: DomainMismatch }) {
  const found = mismatch.found.length ? mismatch.found.join(', ') : 'aucun enregistrement';
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="rounded-lg border border-border px-3 py-2">
        <p className="text-[12px] text-secondary">Attendu ({mismatch.type})</p>
        <p className="font-mono text-[13px] font-semibold break-all">{mismatch.expected}</p>
      </div>
      <div className="rounded-lg border-2 border-danger bg-danger-alert-bg px-3 py-2">
        <p className="text-[12px] text-danger">Trouvé</p>
        <p className="font-mono text-[13px] font-semibold break-all">{found}</p>
      </div>
    </div>
  );
}

type LastCheck = { at: string; error?: string; mismatch?: DomainMismatch | null };
const checkKey = (domain: string) => `communeo.domaine.dernier-essai:${domain}`;

function DomainForm({ onSaved }: { onSaved: () => void }) {
  const id = useId();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const domain = normalizeDomain(value);
    if (!DOMAIN_FORMAT.test(domain)) {
      setError('Indiquez un nom de domaine, par exemple saint-aubin-sur-loire.fr');
      document.getElementById(`${id}-domaine`)?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await configureDomain(domain);
      onSaved();
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : "Le domaine n'a pas pu être enregistré.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void submit();
      }}
      className="space-y-2"
    >
      <label htmlFor={`${id}-domaine`} className="font-medium">
        Adresse de votre site
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={`${id}-domaine`}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-aide${error ? ` ${id}-erreur` : ''}`}
          className={cn(controlClass, 'h-11 min-w-0 flex-1 md:h-10')}
        />
        <Button type="submit" className="max-md:h-11" disabled={busy}>
          {busy && <Loader2 aria-hidden="true" className="animate-spin" />}
          Enregistrer le domaine
        </Button>
      </div>
      <p id={`${id}-aide`} className="text-[13px] text-secondary">
        Par exemple saint-aubin-sur-loire.fr, avec ou sans « www ». Le nom de domaine s'achète auprès d'un registraire
        (OVH, Gandi…).
      </p>
      {error && (
        <p id={`${id}-erreur`} role="alert" className="flex items-center gap-1.5 text-[13px] font-medium text-danger">
          <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </form>
  );
}

function DomainCard({ status, onChanged }: { status: DomainStatus; onChanged: () => void }) {
  const client = useQueryClient();
  const domain = status.customDomain!;
  const [lastCheck, setLastCheck] = useState<LastCheck | null>(() => {
    try {
      return JSON.parse(localStorageGet(checkKey(domain)) ?? 'null') as LastCheck | null;
    } catch {
      return null;
    }
  });
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showDns, setShowDns] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const verified = status.domainStatus === 'verified';
  const failed = !verified && (status.domainStatus === 'error' || !!lastCheck?.error);

  const verify = async () => {
    setChecking(true);
    try {
      const result = await verifyDomain();
      const check: LastCheck = result.success
        ? { at: new Date().toISOString() }
        : { at: result.checkedAt, error: result.error, mismatch: result.mismatch };
      setLastCheck(check);
      localStorageSet(checkKey(domain), JSON.stringify(check));
      if (result.success) {
        toast.success(
          `${domain} est vérifié. Le certificat HTTPS est en cours de création ; le site est remis en ligne à cette adresse.`,
        );
        void client.invalidateQueries({ queryKey: publicationQuery.queryKey });
        void client.invalidateQueries({ queryKey: sessionQuery.queryKey });
        onChanged();
      }
    } catch (error) {
      toast.error(
        `La vérification n'a pas pu être lancée : ${error instanceof ApiError ? error.message : 'erreur inattendue'}`,
      );
    } finally {
      setChecking(false);
    }
  };

  const records = status.dnsInstructions?.records ?? [];

  return (
    <div className={cn('rounded-xl border p-4', failed ? 'border-2 border-danger' : 'border-border')}>
      <div className="flex flex-wrap items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full',
            verified
              ? 'bg-success-bg text-success'
              : failed
                ? 'bg-danger-alert-bg text-danger'
                : 'bg-warning-bg text-warning',
          )}
        >
          {verified ? <Lock className="size-4" /> : <CircleAlert className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold break-all">{domain}</h3>
          <p className="text-[13px] text-secondary">
            {verified
              ? `Vérifié ${status.domainConfiguredAt ? `le ${formatListDate(new Date(status.domainConfiguredAt), now).toLowerCase()}` : ''} · certificat HTTPS ${status.sslEnabled ? 'actif, renouvelé automatiquement' : 'en cours de création'}`
              : failed && lastCheck
                ? `La vérification a échoué ${formatListDate(new Date(lastCheck.at), now).toLowerCase()}`
                : 'En attente de configuration DNS'}
          </p>
        </div>
        {verified ? (
          <StatusBadge tone="success">Actif</StatusBadge>
        ) : failed ? (
          <StatusBadge tone="danger">En erreur</StatusBadge>
        ) : (
          <StatusBadge tone="warning">En attente de configuration</StatusBadge>
        )}
      </div>

      {verified ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <a
            href={`https://${domain}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-brand underline underline-offset-2"
          >
            Ouvrir le site
            <ExternalLink aria-hidden="true" className="size-3.5" />
            <span className="sr-only">(nouvel onglet)</span>
          </a>
          <Button type="button" variant="tertiary" className="text-danger" onClick={() => setRemoving(true)}>
            Retirer ce domaine
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {failed && (
            <>
              <p>
                {lastCheck?.mismatch
                  ? `L'enregistrement ${lastCheck.mismatch.type} ${lastCheck.mismatch.found.length ? 'ne pointe pas vers la bonne adresse' : "n'existe pas encore"}. Demandez la correction à la personne qui gère votre nom de domaine, puis relancez la vérification.`
                  : 'Le domaine ne pointe pas encore vers votre site. Vérifiez les enregistrements DNS, puis relancez la vérification.'}
              </p>
              {lastCheck?.mismatch && <Mismatch mismatch={lastCheck.mismatch} />}
            </>
          )}
          {(!failed || showDns) && records.length > 0 && (
            <>
              <p>
                Transmettez {records.length > 1 ? `ces ${records.length} enregistrements` : 'cet enregistrement'} à la
                personne qui gère votre nom de domaine. La prise en compte peut demander jusqu'à 24 heures.
              </p>
              <DnsTable records={records} />
            </>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {records.length > 0 && !failed && (
              <Button asChild variant="secondary" className="max-md:h-11">
                <a href={mailto(domain, records)}>
                  <Mail aria-hidden="true" />
                  Envoyer par e-mail
                </a>
              </Button>
            )}
            <Button type="button" className="max-md:h-11" disabled={checking} onClick={() => void verify()}>
              {checking && <Loader2 aria-hidden="true" className="animate-spin" />}
              {failed ? 'Vérifier à nouveau' : 'Vérifier maintenant'}
            </Button>
            {failed && records.length > 0 && !showDns && (
              <Button type="button" variant="secondary" className="max-md:h-11" onClick={() => setShowDns(true)}>
                Revoir les instructions DNS
              </Button>
            )}
            {lastCheck && (
              <p className="ml-auto text-[13px] text-secondary">
                Dernier essai {relativeTime(new Date(lastCheck.at), now)}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="tertiary"
            size="sm"
            className="-ml-3 text-danger"
            onClick={() => setRemoving(true)}
          >
            Retirer ce domaine
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title={`Retirer ${domain} ?`}
        description={
          verified
            ? 'Le site ne sera plus visible à cette adresse : il revient à son adresse Communeo après la prochaine mise en ligne, lancée tout de suite.'
            : 'Les instructions DNS seront perdues ; vous pourrez enregistrer un autre domaine.'
        }
        confirmLabel="Retirer le domaine"
        onConfirm={async () => {
          try {
            await removeDomain();
          } catch (error) {
            throw new Error(
              `Le domaine n'a pas pu être retiré : ${error instanceof ApiError ? error.message : 'erreur inattendue'}`,
            );
          }
          localStorageSet(checkKey(domain), 'null');
          toast.success(`${domain} a été retiré.`);
          void client.invalidateQueries({ queryKey: sessionQuery.queryKey });
          onChanged();
        }}
      />
    </div>
  );
}

export function DomainSection() {
  const status = useQuery({ ...domainQuery, retry: false });
  const refresh = () => void status.refetch();
  const unavailable = status.error instanceof ApiError && status.error.status === 503;

  const data = status.data;
  const verified = data?.domainStatus === 'verified';
  // Erreur de vérification : l'étape 3 est celle en cours (le DNS est à corriger puis revérifier)
  const failed = data?.domainStatus === 'error';
  const current = !data?.hasCustomDomain ? 0 : verified ? 3 : failed ? 2 : 1;
  const done = !data?.hasCustomDomain ? 0 : verified ? 4 : failed ? 2 : 1;

  return (
    <section
      aria-labelledby="domaine-titre"
      className="space-y-4 rounded-xl border border-border bg-surface p-5 dark:bg-sidebar"
    >
      <div>
        <h2 id="domaine-titre" className="text-xl">
          Domaine personnalisé
        </h2>
        <p className="mt-1 text-secondary">
          Votre site à l'adresse de la commune (saint-aubin-sur-loire.fr) plutôt qu'à son adresse Communeo.
        </p>
      </div>
      {unavailable ? (
        <p role="status" className="rounded-lg bg-neutral-bg p-3">
          La gestion du domaine n'est pas disponible pour le moment. Réessayez plus tard ou contactez l'assistance.
        </p>
      ) : status.isError ? (
        <div role="alert" className="rounded-lg border border-danger bg-danger-alert-bg p-3">
          L'état du domaine n'a pas pu être chargé.{' '}
          <Button type="button" variant="secondary" size="sm" onClick={refresh}>
            Réessayer
          </Button>
        </div>
      ) : !data ? (
        <div aria-busy="true" className="h-24 animate-pulse rounded-lg bg-neutral-bg" />
      ) : (
        <>
          <Steps current={current} done={done} />
          {data.hasCustomDomain ? (
            <DomainCard key={data.customDomain} status={data} onChanged={refresh} />
          ) : (
            <DomainForm onSaved={refresh} />
          )}
        </>
      )}
    </section>
  );
}
