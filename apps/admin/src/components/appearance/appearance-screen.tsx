/**
 * Apparence (handoff 6.7, ticket #144, administrateurs) : galerie des thèmes, aperçu plein écran du
 * vrai site de la commune dans chaque thème (bascule entre thèmes et largeurs), confirmation avec
 * mise en ligne immédiate cochée par défaut. Les contenus ne changent pas, seule la présentation.
 * Un thème du registre pas encore construit est montré « bientôt disponible », sans action.
 */
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Dialog } from 'radix-ui';
import { CheckCircle2, CircleAlert, ExternalLink, Eye, Loader2, Palette, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { HOMEPAGE_SECTIONS, themeHomeSections, THEMES } from '@communeo/core';
import { PreviewView, type PreviewState } from '@/components/editor/preview-panel';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, useReturnFocus } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { focusHeadingIfRequested } from '@/lib/focus';
import { previewQuery } from '@/lib/preview';
import { publicationQuery, usePublish } from '@/lib/publication';
import { sessionQuery, themeName } from '@/lib/session';
import { saveSiteSettings, type SiteSettings } from '@/lib/site-settings';
import { cn } from '@/lib/utils';

type Theme = (typeof THEMES)[number];

/** Vignettes 1200 × 800 générées par `pnpm theme:thumbnail <id>` (themes/<id>/thumbnail.png) */
const THUMBNAILS = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../../../../themes/*/thumbnail.png', { eager: true, query: '?url', import: 'default' }),
  ).map(([path, url]) => [path.split('/').at(-2)!, url as string]),
);

function Thumbnail({ theme }: { theme: Theme }) {
  const url = THUMBNAILS[theme.id];
  if (url && theme.available) {
    return (
      <img
        src={url}
        alt={`Page d'accueil dans le thème ${theme.name}`}
        width={1200}
        height={800}
        className="aspect-[3/2] w-full rounded-t-[10px] border-b border-border bg-white object-cover object-top"
      />
    );
  }
  // Thème pas encore construit : schéma de page, pas de fausse capture
  return (
    <div
      aria-hidden="true"
      className="flex aspect-[3/2] w-full flex-col gap-2 rounded-t-[10px] border-b border-border bg-sidebar p-4 dark:bg-bg"
    >
      <div className="h-3 w-1/3 rounded bg-border-input" />
      <div className="h-12 rounded bg-border" />
      <div className="grid flex-1 grid-cols-3 gap-2">
        <div className="rounded bg-border" />
        <div className="rounded bg-border" />
        <div className="rounded bg-border" />
      </div>
    </div>
  );
}

function ThemeCard({
  theme,
  active,
  onPreview,
  onChoose,
}: {
  theme: Theme;
  active: boolean;
  onPreview: () => void;
  onChoose: () => void;
}) {
  return (
    <li
      className={cn(
        'flex flex-col rounded-xl bg-surface dark:bg-sidebar',
        active ? 'border-2 border-brand' : 'border border-border',
      )}
    >
      <Thumbnail theme={theme} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">{theme.name}</h2>
          {active && (
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[12px] font-semibold text-brand">
              Thème actif
            </span>
          )}
          {!theme.available && (
            <span className="rounded-full bg-neutral-bg px-2 py-0.5 text-[12px] font-semibold text-neutral">
              Bientôt disponible
            </span>
          )}
        </div>
        <p className="flex-1 text-secondary">{theme.description}</p>
        {theme.available && (
          <div className="mt-1 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="max-md:h-11"
              aria-label={`Prévisualiser le thème ${theme.name}`}
              onClick={onPreview}
            >
              <Eye aria-hidden="true" />
              Prévisualiser
            </Button>
            {!active && (
              <Button
                type="button"
                className="max-md:h-11"
                aria-label={`Choisir le thème ${theme.name}`}
                onClick={onChoose}
              >
                Choisir
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/** Aperçu plein écran : le vrai site de la commune, dans le thème choisi dans la barre du haut */
function ThemePreview({
  open,
  onOpenChange,
  theme,
  onThemeChange,
  activeTheme,
  onChoose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  activeTheme: string;
  onChoose: () => void;
}) {
  const [version, setVersion] = useState(0);
  const returnFocus = useReturnFocus();
  const link = useQuery({ ...previewQuery({ type: 'home' }, { theme: theme.id }), enabled: open });
  const state: PreviewState = {
    url: link.data?.url,
    unavailable: link.isError ? 'Aperçu indisponible pour le moment.' : undefined,
    version,
    title: `Votre site dans le thème ${theme.name}`,
    themeName: theme.name,
    caption: `Votre site dans le thème ${theme.name}${theme.id === activeTheme ? ' (actif)' : ''}`,
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Content {...returnFocus} className="fixed inset-0 z-50 flex flex-col bg-surface dark:bg-sidebar">
          <Dialog.Title className="sr-only">Aperçu de votre site dans le thème {theme.name}</Dialog.Title>
          <Dialog.Description className="sr-only">
            Votre vrai site, dans le thème choisi. Rien n'est modifié tant que vous ne choisissez pas le thème.
          </Dialog.Description>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2">
            <Dialog.Close asChild>
              <Button type="button" variant="secondary" size="sm" className="max-md:h-11">
                <X aria-hidden="true" />
                Fermer l'aperçu
              </Button>
            </Dialog.Close>
            <fieldset className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              <legend className="sr-only">Thème montré</legend>
              {THEMES.map((entry) => (
                <label
                  key={entry.id}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium has-focus-visible:outline-2 has-focus-visible:outline-brand max-md:py-2.5',
                    entry.id === theme.id ? 'bg-brand-button text-on-brand' : 'hover:bg-surface-hover',
                    !entry.available && 'cursor-not-allowed text-secondary hover:bg-transparent',
                  )}
                >
                  <input
                    type="radio"
                    name="theme-apercu"
                    className="sr-only"
                    checked={entry.id === theme.id}
                    disabled={!entry.available}
                    onChange={() => onThemeChange(entry)}
                  />
                  {entry.name}
                  {entry.id === activeTheme && <span className="text-[11px] font-normal opacity-80">actif</span>}
                  {!entry.available && <span className="text-[11px] font-normal">bientôt</span>}
                </label>
              ))}
            </fieldset>
            {theme.id !== activeTheme && (
              <Button type="button" className="max-md:h-11" onClick={onChoose}>
                Choisir le thème {theme.name}
              </Button>
            )}
          </div>
          <div className="min-h-0 flex-1">
            <PreviewView state={state} onReload={() => setVersion((value) => value + 1)} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** État de la mise en ligne lancée après un changement de thème (parcours B, écrans 4 et 5) */
function SwitchStatus({ theme, published }: { theme: string; published: boolean }) {
  const { data: user } = useSuspenseQuery(sessionQuery);
  const { data: status } = useQuery(publicationQuery);
  const name = themeName(theme);
  if (!published) {
    return (
      <p role="status" className="flex gap-2.5 rounded-xl border border-border bg-surface p-4 dark:bg-sidebar">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
        <span>Thème {name} enregistré. Il sera visible sur le site à la prochaine mise en ligne.</span>
      </p>
    );
  }
  const state = status?.state;
  return (
    <div
      role="status"
      className={cn(
        'flex gap-2.5 rounded-xl border p-4',
        state === 'failed' ? 'border-danger bg-danger-alert-bg' : 'border-border bg-surface dark:bg-sidebar',
      )}
    >
      {state === 'failed' ? (
        <>
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
          <p>
            La mise en ligne du thème {name} a échoué. Le site reste dans l'ancien thème.{' '}
            <Link to="/mise-en-ligne" className="font-semibold underline underline-offset-2">
              Voir le détail
            </Link>
          </p>
        </>
      ) : state === 'ok' || state === 'idle' ? (
        <>
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
          <p>
            Le thème {name} est en ligne.{' '}
            {user.site?.live_url && (
              <a
                href={user.site.live_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
              >
                Voir le site
                <ExternalLink aria-hidden="true" className="size-3.5" />
                <span className="sr-only">(nouvel onglet)</span>
              </a>
            )}
          </p>
        </>
      ) : (
        <>
          <Loader2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 animate-spin text-brand" />
          <p>
            Le thème {name} est en cours de mise en ligne. Le site reste accessible dans l'ancien thème pendant
            l'opération ; vous pouvez quitter cet écran.
          </p>
        </>
      )}
    </div>
  );
}

export function AppearanceScreen({ site }: { site: SiteSettings }) {
  const client = useQueryClient();
  const publish = usePublish();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => focusHeadingIfRequested(heading.current), []);
  useEffect(() => {
    document.title = 'Apparence · Communeo';
  }, []);

  const activeTheme = site.theme ?? THEMES[0].id;
  const [previewed, setPreviewed] = useState<Theme | null>(null);
  const [choosing, setChoosing] = useState<Theme | null>(null);
  const [publishNow, setPublishNow] = useState(true);
  const [switched, setSwitched] = useState<{ theme: string; published: boolean } | null>(null);
  // Mise en ligne immédiate cochée à chaque ouverture de la confirmation
  const choose = (theme: Theme | null) => {
    setPublishNow(true);
    setChoosing(theme);
  };

  const confirm = async () => {
    const target = choosing!;
    const previous = activeTheme;
    try {
      await saveSiteSettings(client, site.documentId, { theme: target.id });
    } catch (error) {
      throw new Error(
        `Le thème n'a pas pu être changé : ${error instanceof ApiError ? error.message : 'erreur inattendue'}`,
      );
    }
    setPreviewed(null);
    let published = false;
    if (publishNow) {
      try {
        await publish.mutateAsync();
        published = true;
      } catch {
        toast.error(
          `Thème ${target.name} enregistré, mais la mise en ligne n'a pas démarré. Relancez-la avec « Mettre en ligne ».`,
        );
      }
    }
    setSwitched({ theme: target.id, published });
    // Sections d'accueil que l'ancien thème n'affichait pas : désormais réglables
    const before = themeHomeSections(previous);
    const added = HOMEPAGE_SECTIONS.filter(
      (section) => themeHomeSections(target.id).includes(section.id) && !before.includes(section.id),
    );
    toast.success(
      `Thème ${target.name} choisi.${added.length ? ` Nouvelles sections d'accueil disponibles : ${added.map((section) => section.label).join(', ')}.` : ''}`,
    );
  };

  return (
    <div className="mx-auto max-w-[960px] space-y-6">
      <div>
        <h1 ref={heading} className="outline-none">
          Apparence
        </h1>
        <p className="mt-2 max-w-[640px] text-secondary">
          Le thème décide de la mise en page, des couleurs et de la typographie de votre site. Vos contenus sont
          conservés quel que soit le thème choisi : seule la présentation change.
        </p>
      </div>

      {switched && <SwitchStatus theme={switched.theme} published={switched.published} />}

      <ul className="grid gap-4 sm:grid-cols-2" aria-label="Thèmes">
        {THEMES.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            active={theme.id === activeTheme}
            onPreview={() => setPreviewed(theme)}
            onChoose={() => choose(theme)}
          />
        ))}
      </ul>

      <p className="flex gap-2.5 text-[13px] text-secondary">
        <Palette aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          Les couleurs et les polices ne se règlent pas : elles font partie du thème. Votre identité tient au nom et au
          logo de la commune, modifiables dans{' '}
          <Link to="/mon-site/informations" className="font-medium text-brand underline underline-offset-2">
            Informations de la commune
          </Link>
          .
        </span>
      </p>

      <ThemePreview
        open={previewed !== null}
        onOpenChange={(open) => !open && setPreviewed(null)}
        theme={previewed ?? THEMES[0]}
        onThemeChange={setPreviewed}
        activeTheme={activeTheme}
        onChoose={() => choose(previewed)}
      />
      <ConfirmDialog
        open={choosing !== null}
        onOpenChange={(open) => !open && setChoosing(null)}
        tone="info"
        icon={Palette}
        title={`Passer au thème ${choosing?.name ?? ''} ?`}
        description="Vos contenus sont conservés, seule la présentation change. Le nouveau thème sera visible sur le site après la prochaine mise en ligne."
        confirmLabel={`Passer au thème ${choosing?.name ?? ''}`}
        onConfirm={confirm}
      >
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={publishNow}
            onChange={(event) => setPublishNow(event.target.checked)}
            className="mt-0.5 size-[18px] shrink-0 rounded accent-[var(--brand-button)]"
          />
          Mettre en ligne immédiatement après le changement
        </label>
      </ConfirmDialog>
    </div>
  );
}
