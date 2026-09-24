/**
 * Page d'accueil en intentions (handoff 6.8, ticket #143) : la commune choisit ce qui apparaît,
 * le thème décide de l'ordre et de la mise en page (pas de poignée de déplacement, volontairement).
 * - une ligne par section : interrupteur, nom, résumé, formulaire déplié en place ;
 * - enregistrement automatique (état dans l'en-tête), la preview se recharge et montre la section ouverte ;
 * - les sections que le thème actif n'affiche pas sont rangées à part, leur réglage est conservé.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBlocker } from '@tanstack/react-router';
import { Switch as SwitchPrimitive } from 'radix-ui';
import { ChevronDown, Eye, Info } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Controller, useFormState, useWatch, type FieldErrors } from 'react-hook-form';
import { HOMEPAGE_SECTIONS, themeHomeSections, type HomepageSectionId } from '@communeo/core';
import { PreviewDrawer, PreviewFullscreen, PreviewView, type PreviewState } from '@/components/editor/preview-panel';
import { SaveStatus } from '@/components/editor/save-status';
import { useAutosave } from '@/components/editor/use-autosave';
import { flattenErrors, Form, TextareaField, useZodForm } from '@/components/form';
import { Button } from '@/components/ui/button';
import { UnsavedChangesDialog } from '@/components/ui/confirm-dialog';
import { focusHeadingIfRequested } from '@/lib/focus';
import {
  homepageQuery,
  sectionLabel,
  sectionSummary,
  toHomepagePayload,
  toHomepageValues,
  type HomepageValues,
} from '@/lib/homepage';
import { previewQuery } from '@/lib/preview';
import { themeName } from '@/lib/session';
import { saveSiteSettings, type SiteSettings } from '@/lib/site-settings';
import { cn } from '@/lib/utils';
import {
  FreeContentForm,
  HeroForm,
  homepageSchema,
  KeyFiguresForm,
  ListingForm,
  MayorWordForm,
  PartnersForm,
  QuickLinksForm,
} from './section-forms';

const FORMS: Partial<Record<HomepageSectionId, () => ReactNode>> = {
  hero: () => <HeroForm />,
  quick_links: () => <QuickLinksForm />,
  featured_news: () => <ListingForm section="featured_news" label="Nombre d’actualités affichées" />,
  agenda: () => <ListingForm section="agenda" label="Nombre d’événements affichés" />,
  associations: () => <ListingForm section="associations" label="Nombre d’associations affichées" />,
  mayor_word: () => <MayorWordForm />,
  key_figures: () => <KeyFiguresForm />,
  partners: () => <PartnersForm />,
  free_content: () => <FreeContentForm />,
};

const errorsOf = (errors: FieldErrors, id: HomepageSectionId) =>
  flattenErrors(errors).filter((error) => error.name.startsWith(`${id}.`)).length;

function SectionRow({
  id,
  open,
  onToggle,
  summary,
}: {
  id: HomepageSectionId;
  open: boolean;
  onToggle: () => void;
  summary: string;
}) {
  const label = sectionLabel(id);
  const enabled = useWatch<HomepageValues>({ name: `${id}.enabled` as never }) as unknown as boolean;
  const { errors } = useFormState<HomepageValues>();
  const count = errorsOf(errors, id);
  const form = FORMS[id];
  const panelId = `section-${id}`;
  return (
    <li
      id={`ligne-${id}`}
      className={cn('rounded-xl border bg-surface dark:bg-sidebar', open ? 'border-2 border-brand' : 'border-border')}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <Controller
          name={`${id}.enabled` as never}
          render={({ field: { value, onChange } }) => (
            <SwitchPrimitive.Root
              checked={!!value}
              onCheckedChange={onChange}
              aria-label={`Afficher « ${label} » sur l'accueil`}
              className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-border-input transition-colors data-[state=checked]:bg-brand-button max-md:my-3"
            >
              <SwitchPrimitive.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[18px]" />
            </SwitchPrimitive.Root>
          )}
        />
        {form ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={onToggle}
            className="-my-1 flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md text-left"
          >
            <SectionText label={label} summary={enabled ? summary : 'Masquée'} errors={count} />
            <ChevronDown
              aria-hidden="true"
              className={cn('size-4 shrink-0 text-secondary transition-transform', open && 'rotate-180')}
            />
          </button>
        ) : (
          <div className="flex min-h-11 min-w-0 flex-1 items-center">
            <SectionText label={label} summary={enabled ? summary : 'Masquée'} errors={0} />
          </div>
        )}
      </div>
      {form && open && (
        <div
          id={panelId}
          role="group"
          aria-label={`Réglages : ${label}`}
          className="grid gap-4 border-t border-border px-4 py-4"
        >
          {form()}
        </div>
      )}
    </li>
  );
}

function SectionText({ label, summary, errors }: { label: string; summary: string; errors: number }) {
  return (
    <span className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-2.5">
      <span className="block shrink-0 font-semibold">{label}</span>
      <span className="block truncate text-[13px] text-secondary">{summary}</span>
      {errors > 0 && (
        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 text-[13px] text-danger">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
          {errors} erreur{errors > 1 ? 's' : ''}
        </span>
      )}
    </span>
  );
}

export function HomepageEditor({
  site,
  homepage,
}: {
  site: SiteSettings;
  homepage: { documentId: string; updatedAt: string; homepage: Record<string, unknown> | null | undefined };
}) {
  const client = useQueryClient();
  const form = useZodForm(homepageSchema, toHomepageValues(homepage.homepage));
  const values = useWatch({ control: form.control }) as HomepageValues;
  const [open, setOpen] = useState<HomepageSectionId | null>(null);
  // Section montrée par la preview : la dernière ouverte
  const [shown, setShown] = useState<HomepageSectionId | null>(null);
  const [version, setVersion] = useState(0);
  const [preview, setPreview] = useState<'drawer' | 'fullscreen' | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => focusHeadingIfRequested(heading.current), []);
  useEffect(() => {
    document.title = "Page d'accueil · Communeo";
  }, []);

  const theme = themeName(site.theme);
  const available = themeHomeSections(site.theme);
  const sections = HOMEPAGE_SECTIONS.filter((section) => available.includes(section.id));
  const unavailable = HOMEPAGE_SECTIONS.filter((section) => !available.includes(section.id));
  const shownCount = sections.filter((section) => values[section.id]?.enabled).length;
  const context = {
    siteName: site.name,
    hasCoordinates: site.infos_pratiques?.latitude != null && site.infos_pratiques?.longitude != null,
  };

  const autosave = useAutosave<HomepageValues>({
    values,
    save: async (snapshot) => {
      // Champs incomplets : rien n'est envoyé, les sections concernées s'ouvrent sur leurs erreurs
      // Vérification comme un envoi : ensuite, chaque champ modifié est revérifié aussitôt
      let valid = false;
      await form.handleSubmit(
        () => {
          valid = true;
        },
        () => undefined,
      )();
      if (!valid) {
        const first = sections.find((section) => errorsOf(form.formState.errors, section.id) > 0);
        if (first) setOpen((current) => (current && errorsOf(form.formState.errors, current) > 0 ? current : first.id));
        throw new Error('Des champs sont à compléter : l’accueil sera enregistré une fois corrigés.');
      }
      await saveSiteSettings(client, site.documentId, { homepage: toHomepagePayload(snapshot) }, {});
      void client.invalidateQueries({ queryKey: homepageQuery(site.documentId).queryKey });
      setVersion((value) => value + 1);
    },
  });

  // Quitter l'écran : l'accueil est enregistré d'abord ; la fenêtre ne s'ouvre que si ça échoue
  const blocker = useBlocker({
    shouldBlockFn: async () => !(await autosave.flush()),
    enableBeforeUnload: () => autosave.isDirty(),
    withResolver: true,
  });

  const previewLink = useQuery(previewQuery({ type: 'home' }));
  const previewUrl =
    previewLink.data?.url && shown
      ? `${previewLink.data.url}${previewLink.data.url.includes('?') ? '&' : '?'}section=${shown}`
      : previewLink.data?.url;
  const previewState: PreviewState = {
    url: previewUrl,
    unavailable: previewLink.isError ? 'Aperçu indisponible pour le moment.' : undefined,
    version,
    title: 'Accueil',
    themeName: theme,
    caption: `Aperçu de l'accueil — thème ${theme}`,
  };

  const toggle = (id: HomepageSectionId) => {
    setOpen((current) => (current === id ? null : id));
    setShown(id);
  };

  return (
    <Form
      form={form}
      requiredNote={false}
      summary={false}
      onSubmit={() => void autosave.flush()}
      className="-mx-4 -mt-6 md:-mx-8 md:-mt-7"
    >
      <div className="flex">
        <div className="min-w-0 flex-1 px-4 pt-6 pb-16 md:px-8 md:py-7">
          <div className="mx-auto max-w-[760px] space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div>
                <h1 ref={heading} className="outline-none">
                  Page d'accueil
                </h1>
                <p className="mt-1 text-secondary">
                  {shownCount} section{shownCount > 1 ? 's' : ''} affichée{shownCount > 1 ? 's' : ''} sur{' '}
                  {sections.length} disponibles
                </p>
              </div>
              <div className="flex items-center gap-2">
                <SaveStatus
                  state={autosave.state}
                  onRetry={() => void autosave.flush()}
                  saved="Enregistré"
                  failed="Accueil non enregistré"
                  showReason
                />
                <Button
                  type="button"
                  variant="tertiary"
                  className="min-[1200px]:hidden"
                  onClick={() => setPreview(window.innerWidth < 768 ? 'fullscreen' : 'drawer')}
                >
                  <Eye aria-hidden="true" />
                  Aperçu
                </Button>
              </div>
            </div>

            <p className="flex gap-2.5 rounded-xl border border-border bg-surface p-4 dark:bg-sidebar">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand" />
              <span>
                Vous choisissez <strong>ce qui apparaît</strong> sur votre accueil. L’ordre et la mise en page sont
                décidés par le thème {theme}, pour que la page reste lisible sur tous les écrans.
              </span>
            </p>

            <ul className="space-y-2" aria-label="Sections de l'accueil">
              {sections.map((section) => (
                <SectionRow
                  key={section.id}
                  id={section.id}
                  open={open === section.id}
                  onToggle={() => toggle(section.id)}
                  summary={sectionSummary(section.id, values, context)}
                />
              ))}
            </ul>

            {unavailable.length > 0 && (
              <section
                aria-labelledby="sections-indisponibles"
                className="rounded-xl border border-dashed border-border-input p-4"
              >
                <h2 id="sections-indisponibles" className="text-base font-semibold">
                  {unavailable.length} section{unavailable.length > 1 ? 's' : ''} non disponible
                  {unavailable.length > 1 ? 's' : ''} avec le thème {theme}
                </h2>
                <p className="mt-1 text-[13px] text-secondary">
                  Le thème {theme} ne les affiche pas. Leurs réglages sont gardés : ils reviennent si vous changez de
                  thème.
                </p>
                <ul className="mt-2 list-disc pl-5 text-secondary">
                  {unavailable.map((section) => (
                    <li key={section.id}>{section.label}</li>
                  ))}
                </ul>
              </section>
            )}

            <details className="rounded-xl border border-border bg-surface p-5 dark:bg-sidebar">
              <summary className="cursor-pointer font-semibold">Référencement</summary>
              <div className="mt-4">
                <TextareaField
                  name="meta_description"
                  label="Description pour les moteurs de recherche"
                  rows={2}
                  help="160 caractères au plus. Par défaut, le sous-titre de l'accroche."
                />
              </div>
            </details>
          </div>
        </div>

        <div className="sticky top-14 hidden h-[calc(100dvh-56px)] w-[440px] shrink-0 border-l border-border min-[1200px]:flex">
          <aside aria-label="Aperçu de l'accueil" className="min-w-0 flex-1 bg-surface dark:bg-sidebar">
            <PreviewView
              state={previewState}
              onReload={() => setVersion((value) => value + 1)}
              onFullscreen={() => setPreview('fullscreen')}
            />
          </aside>
        </div>
      </div>

      <PreviewDrawer
        open={preview === 'drawer'}
        onOpenChange={(value) => setPreview(value ? 'drawer' : null)}
        state={previewState}
        onReload={() => setVersion((value) => value + 1)}
        onFullscreen={() => setPreview('fullscreen')}
      />
      <PreviewFullscreen
        open={preview === 'fullscreen'}
        onOpenChange={(value) => setPreview(value ? 'fullscreen' : null)}
        state={previewState}
        onReload={() => setVersion((value) => value + 1)}
      />
      {blocker.status === 'blocked' && (
        <UnsavedChangesDialog
          open
          onStay={() => blocker.reset()}
          onLeave={() => blocker.proceed()}
          onSaveAndLeave={async () => ((await autosave.flush()) ? blocker.proceed() : blocker.reset())}
        />
      )}
    </Form>
  );
}
