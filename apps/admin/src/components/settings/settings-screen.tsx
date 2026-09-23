/**
 * Gabarit des écrans de réglages (handoff 6.10) : barre d'enregistrement, colonne de 760 px en
 * cartes, sommaire des réglages collant à droite (≥ 1200 px) avec un point orange sur les écrans
 * où manque un champ requis pour la conformité. Quitter l'écran avec des modifications non
 * enregistrées ouvre la fenêtre à trois issues (rester, quitter sans enregistrer, enregistrer).
 */
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { type ReactNode, type Ref } from 'react';
import { UnsavedChangesGuard } from '@/components/form';
import { Button } from '@/components/ui/button';
import { screensToComplete, type SettingsScreenId } from '@/lib/compliance';
import { sessionQuery } from '@/lib/session';
import { siteSettingsQuery, type SiteSettings } from '@/lib/site-settings';
import { cn } from '@/lib/utils';
import { SettingsBar } from './settings-bar';

const SCREENS: Array<{ id: SettingsScreenId; label: string; to: string; adminOnly?: boolean }> = [
  { id: 'informations', label: 'Informations de la commune', to: '/mon-site/informations' },
  { id: 'legal', label: 'Mentions légales et RGPD', to: '/mon-site/legal', adminOnly: true },
  { id: 'accessibilite', label: 'Accessibilité', to: '/mon-site/accessibilite' },
  { id: 'reseaux', label: 'Réseaux sociaux', to: '/mon-site/reseaux' },
  { id: 'demarches', label: 'Démarches', to: '/mon-site/demarches' },
  { id: 'open-data', label: 'Open data', to: '/mon-site/open-data' },
];

function SettingsNav({ current, site }: { current: SettingsScreenId; site: SiteSettings }) {
  const { data: user } = useSuspenseQuery(sessionQuery);
  const admin = user.municipality_role === 'admin' || user.municipality_role === 'super_admin';
  const missing = screensToComplete(site);
  return (
    <nav
      aria-labelledby="sommaire-reglages"
      className="sticky top-[140px] hidden w-[200px] shrink-0 self-start min-[1200px]:block"
    >
      <h2 id="sommaire-reglages" className="mb-2 text-[11px] font-semibold tracking-[0.06em] text-secondary uppercase">
        Mon site
      </h2>
      <ul className="border-l-2 border-border">
        {SCREENS.filter((screen) => admin || !screen.adminOnly).map((screen) => (
          <li key={screen.id}>
            <Link
              to={screen.to}
              aria-current={screen.id === current ? 'page' : undefined}
              className={cn(
                '-ml-0.5 flex items-center gap-2 border-l-2 py-2 pl-3.5 text-[13px]',
                screen.id === current
                  ? 'border-brand font-semibold text-brand'
                  : 'border-transparent text-secondary hover:text-text',
              )}
            >
              {screen.label}
              {missing.has(screen.id) && (
                <>
                  <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-warning" />
                  <span className="sr-only">(à compléter pour la conformité)</span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12px] leading-snug text-secondary">
        Un point orange signale un écran dont un champ requis pour la conformité manque.
      </p>
    </nav>
  );
}

export function SettingsScreen({
  id,
  title,
  site,
  headingRef,
  dirty,
  saving,
  savedAt,
  onCancel,
  onSave,
  form,
  children,
}: {
  id: SettingsScreenId;
  title: string;
  site: SiteSettings;
  headingRef?: Ref<HTMLHeadingElement>;
  dirty: boolean;
  saving: boolean;
  savedAt: string;
  onCancel: () => void;
  /** Enregistrement depuis la fenêtre « modifications non enregistrées » ; `true` si réussi */
  onSave: () => Promise<boolean>;
  /** Identifiant du <form> envoyé par « Enregistrer » */
  form: string;
  children: ReactNode;
}) {
  return (
    <div className="-mx-4 -mt-6 md:-mx-8 md:-mt-7">
      <SettingsBar
        title={title}
        headingRef={headingRef}
        dirty={dirty}
        saving={saving}
        savedAt={savedAt}
        onCancel={onCancel}
        saveType="submit"
        form={form}
      />
      <div className="flex justify-center gap-10 px-4 pt-6 pb-28 md:px-8 md:py-7">
        <div className="w-full max-w-[760px] min-w-0">{children}</div>
        <SettingsNav current={id} site={site} />
      </div>
      <UnsavedChangesGuard when={dirty} onSave={onSave} />
    </div>
  );
}

/** Chargement et erreur communs aux écrans de réglages */
export function useSiteSettings() {
  const { data: user } = useSuspenseQuery(sessionQuery);
  return useQuery(siteSettingsQuery(user.site!.documentId));
}

export function SettingsLoading({ title, error, onRetry }: { title: string; error?: boolean; onRetry?: () => void }) {
  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-danger bg-danger-alert-bg p-6">
        <h1 className="text-xl">{title}</h1>
        <p className="mt-2">Les réglages n'ont pas pu être chargés.</p>
        <Button variant="secondary" className="mt-3" onClick={onRetry}>
          Réessayer
        </Button>
      </div>
    );
  }
  return (
    <div aria-busy="true" className="mx-auto max-w-[760px] space-y-4">
      <h1 className="sr-only">{title}</h1>
      <div className="h-8 w-1/3 animate-pulse rounded bg-neutral-bg" />
      <div className="h-64 animate-pulse rounded-xl bg-neutral-bg" />
    </div>
  );
}
