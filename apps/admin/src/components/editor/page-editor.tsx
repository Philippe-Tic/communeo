/**
 * Éditeur d'une page (handoff 6.3, structure 1a sans la preview, qui arrive avec #136) : barre d'actions,
 * en-tête du contenu, blocs, référencement. Brouillon enregistré automatiquement, publication et
 * programmation validées par les règles de @communeo/core.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useBlocker, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Check, Clock, ExternalLink, Eye, Image as ImageIcon, Maximize2, MoreHorizontal, PanelRightOpen, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { z } from 'zod';
import { SLUG_MAX_LENGTH, SLUG_PATTERN, slugify } from '@communeo/core';
import { blocksSchema, BlockEditor, describeBlockError, type Block } from '@/components/blocks';
import { Form, FormSection, SwitchField, TextareaField, TextField, UnsavedChangesGuard, useZodForm } from '@/components/form';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, UnsavedChangesDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PublicationBadge } from '@/components/content-list/publication-badge';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { refreshContent } from '@/lib/content-list';
import { deletePage, pageQuery, pageToValues, publishPage, savePageDraft, schedulePage, type PageDraft, type PageValues } from '@/lib/content-api';
import { formatShortParisDateTime } from '@/lib/dates';
import { focusHeadingIfRequested } from '@/lib/focus';
import { previewQuery } from '@/lib/preview';
import { publicationQuery } from '@/lib/publication';
import { sessionQuery, themeName } from '@/lib/session';
import { cn } from '@/lib/utils';
import { localStorageGet, localStorageSet, PreviewDrawer, PreviewFullscreen, PreviewView, ResizeHandle, type PreviewState } from './preview-panel';
import { SaveStatus } from './save-status';
import { ScheduleDialog } from './schedule-dialog';
import { useAutosave } from './use-autosave';

/** Règles de publication (le brouillon, lui, s'enregistre tel quel) */
const publishSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est obligatoire').max(200, 'Le titre ne doit pas dépasser 200 caractères'),
  slug: z
    .string()
    .trim()
    .max(SLUG_MAX_LENGTH)
    .refine((value) => !value || SLUG_PATTERN.test(value), "L'adresse ne peut contenir que des lettres minuscules, des chiffres et des tirets"),
  lead: z.string().max(300, 'Le chapô ne doit pas dépasser 300 caractères'),
  meta_description: z.string().max(160, 'La description ne doit pas dépasser 160 caractères'),
  show_in_menu: z.boolean(),
  blocks: blocksSchema('publish'),
});

const apiMessage = (error: unknown) => (error instanceof ApiError ? error.message : "Le serveur n'a pas répondu.");

function siteHost(liveUrl: string | null | undefined, slug: string | undefined) {
  try {
    return liveUrl ? new URL(liveUrl).host : `${slug ?? 'commune'}.communeo.fr`;
  } catch {
    return `${slug ?? 'commune'}.communeo.fr`;
  }
}

export function PageEditor({ documentId: initialId, initial, onCreated }: { documentId: string | null; initial?: PageDraft; onCreated: (page: PageDraft) => void }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const { data: session } = useQuery(sessionQuery);
  const form = useZodForm(publishSchema, pageToValues(initial));
  const values = useWatch({ control: form.control }) as PageValues;
  // Identifiant lu par les enregistrements (asynchrones) ; `documentId` sert au rendu
  const id = useRef(initialId);
  const [documentId, setDocumentId] = useState(initialId);
  const [page, setPage] = useState<PageDraft | undefined>(initial);
  const [justPublished, setJustPublished] = useState(false);
  const [dialog, setDialog] = useState<'schedule' | 'delete' | 'preview-drawer' | 'preview-fullscreen' | null>(null);
  // Preview : rechargée après chaque enregistrement, panneau masquable et redimensionnable (mémorisés)
  const [version, setVersion] = useState(0);
  const [previewShown, setPreviewShown] = useState(() => localStorageGet('communeo.preview.shown') !== 'false');
  // 520 px par défaut, 420 px sous 1440 px (écran 1366 des maquettes)
  const [previewWidth, setPreviewWidth] = useState(() => Number(localStorageGet('communeo.preview.width')) || (window.innerWidth < 1440 ? 420 : 520));
  const slugTouched = useRef(!!initial?.published);
  const heading = useRef<HTMLHeadingElement>(null);

  const remember = (doc: PageDraft) => {
    setPage(doc);
    setVersion((value) => value + 1);
    client.setQueryData(pageQuery(doc.documentId).queryKey, doc);
    if (!id.current) {
      id.current = doc.documentId;
      setDocumentId(doc.documentId);
      onCreated(doc);
    }
  };

  const autosave = useAutosave<PageValues>({
    values,
    // Une page neuve n'est enregistrée qu'une fois titrée
    enabled: !!documentId || values.title.trim().length > 0,
    save: async (snapshot) => {
      const doc = await savePageDraft(id.current, snapshot);
      // Brouillon d'une page en ligne : ses modifications ne sont pas encore publiées
      remember({ ...doc, published: page?.published ?? false, modified: page?.published ?? false });
      void refreshContent(client, 'pages', { draftOnly: true });
      if (!snapshot.slug && doc.slug) form.setValue('slug', doc.slug);
    },
  });

  // Adresse générée depuis le titre tant que la page n'a jamais été publiée et qu'on ne l'a pas modifiée
  useEffect(() => {
    if (slugTouched.current) return;
    const generated = slugify(values.title ?? '');
    if (generated !== form.getValues('slug')) form.setValue('slug', generated);
  }, [values.title, form]);

  const title = values.title?.trim() || (documentId ? 'Page sans titre' : 'Nouvelle page');
  useEffect(() => {
    document.title = `${title} — Pages · Communeo`;
  }, [title]);
  useEffect(() => focusHeadingIfRequested(heading.current), []);

  // Quitter l'éditeur : on enregistre d'abord ; la fenêtre ne s'ouvre que si l'enregistrement échoue
  const blocker = useBlocker({ shouldBlockFn: async () => !(await autosave.flush()), enableBeforeUnload: () => autosave.isDirty(), withResolver: true });

  const publish = async (valid: z.output<typeof publishSchema>) => {
    try {
      const doc = await publishPage(id.current, valid as PageValues);
      autosave.markSaved(form.getValues());
      remember({ ...doc, published: true, modified: false, scheduled_at: null });
      void refreshContent(client, 'pages');
      setJustPublished(true);
      setTimeout(() => setJustPublished(false), 3000);
      slugTouched.current = true;
      void client.invalidateQueries({ queryKey: publicationQuery.queryKey });
      const url = session?.site?.live_url;
      toast.success('Publié. Votre site sera mis à jour dans quelques instants.', url ? { label: 'Voir sur le site', onClick: () => window.open(`${url.replace(/\/$/, '')}/${doc.slug}`, '_blank', 'noopener') } : undefined);
    } catch (error) {
      toast.error(`La publication a échoué : ${apiMessage(error)} Vos modifications sont enregistrées.`, { label: 'Réessayer', onClick: () => void form.handleSubmit(publish)() });
    }
  };

  const schedule = async (at: Date) => {
    const valid = await form.trigger();
    if (!valid) {
      setDialog(null);
      void form.handleSubmit(publish)();
      return;
    }
    const doc = await schedulePage(id.current, form.getValues(), at);
    autosave.markSaved(form.getValues());
    remember({ ...doc, published: page?.published ?? false, modified: page?.published ?? false });
    void refreshContent(client, 'pages');
    toast.success(`Publication programmée le ${formatShortParisDateTime(at)}.`);
  };

  const remove = async () => {
    if (id.current) await deletePage(id.current);
    autosave.markSaved(form.getValues());
    void refreshContent(client, 'pages');
    toast.success(`« ${title} » a été supprimée.`);
    await navigate({ to: '/pages' });
  };

  const preview = useQuery(previewQuery(documentId ? { type: 'page', documentId } : null, { slug: page?.slug }));
  const previewState: PreviewState = {
    url: preview.data?.url,
    unavailable: !documentId ? "L'aperçu s'affichera après le premier enregistrement." : preview.isError ? 'Aperçu indisponible pour le moment.' : undefined,
    version,
    title,
    themeName: themeName(session?.site?.theme),
  };
  const reloadPreview = () => setVersion((value) => value + 1);
  const togglePreview = (shown: boolean) => {
    setPreviewShown(shown);
    localStorageSet('communeo.preview.shown', String(shown));
  };

  const status = <PublicationBadge state={page?.published ? (page.modified ? 'modified' : 'published') : 'draft'} scheduledAt={page?.scheduled_at} />;

  return (
    <Form
      form={form}
      onSubmit={publish}
      summaryTitle={(count) => `${count} erreur${count > 1 ? 's empêchent' : ' empêche'} la publication`}
      describeError={(name, message) => describeBlockError(name, message, form.getValues('blocks') as Block[])}
      className="-mx-4 -mt-6 md:-mx-8 md:-mt-7"
      requiredNote={false}
    >
      {/* Barre d'actions */}
      <div className="sticky top-14 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-surface px-4 py-2.5 md:px-8 dark:bg-sidebar">
        <Button asChild variant="ghost" size="icon" aria-label="Retour aux pages">
          <Link to="/pages">
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1 max-md:basis-[calc(100%-56px)]">
          <p className="text-xs text-secondary">Pages</p>
          <div className="flex min-w-0 items-center gap-2">
            <h1 ref={heading} className="truncate text-[15px] leading-tight font-semibold tracking-normal outline-none">
              {title}
            </h1>
            {status}
          </div>
        </div>
        <SaveStatus state={autosave.state} onRetry={() => void autosave.flush()} />
        {/* Actions : dans la barre sur ordinateur, fixées en bas de l'écran sur mobile */}
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-border bg-surface p-3 md:static md:z-auto md:border-0 md:bg-transparent md:p-0 dark:bg-sidebar md:dark:bg-transparent">
        {/* Aperçu : plein écran sur mobile, tiroir sous 1200 px, panneau (ou plein écran) au-delà */}
        <Button type="button" variant="secondary" className="max-md:h-11 max-md:flex-1 md:hidden" onClick={() => setDialog('preview-fullscreen')}>
          <Eye aria-hidden="true" />
          Aperçu
        </Button>
        <Button type="button" variant="tertiary" className="hidden md:max-[1199px]:inline-flex" onClick={() => setDialog('preview-drawer')}>
          <Eye aria-hidden="true" />
          Aperçu
        </Button>
        {previewShown ? (
          <Button type="button" variant="tertiary" className="hidden min-[1200px]:inline-flex" onClick={() => setDialog('preview-fullscreen')}>
            <Maximize2 aria-hidden="true" />
            Aperçu plein écran
          </Button>
        ) : (
          <Button type="button" variant="tertiary" className="hidden min-[1200px]:inline-flex" onClick={() => togglePreview(true)}>
            <PanelRightOpen aria-hidden="true" />
            Afficher l'aperçu
          </Button>
        )}
        <Button type="button" variant="secondary" className="max-md:h-11 max-md:flex-1" onClick={() => setDialog('schedule')}>
          <Clock aria-hidden="true" />
          Programmer
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting} className={cn('max-md:h-11 max-md:flex-1', justPublished && 'bg-success text-white hover:bg-success')}>
          {justPublished ? (
            <>
              <Check aria-hidden="true" />
              Publié
            </>
          ) : form.formState.isSubmitting ? (
            'Publication…'
          ) : (
            'Publier'
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="icon" size="icon" aria-label="Autres actions" className="max-md:size-11">
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {page?.published && session?.site?.live_url && (
              <DropdownMenuItem asChild>
                <a href={`${session.site.live_url.replace(/\/$/, '')}/${page.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden="true" />
                  Voir sur le site
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive disabled={!documentId} onSelect={() => setDialog('delete')}>
              <Trash2 aria-hidden="true" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      <div className="flex items-start">
      <div className="min-w-0 flex-1">
      <div className="mx-auto max-w-[760px] space-y-6 px-4 pt-6 pb-28 md:px-8 md:py-7">
        <FormSection title="En-tête" fields={['title', 'lead', 'slug', 'show_in_menu']}>
          <TextField name="title" label="Titre" required inputProps={{ className: 'h-12 text-lg font-semibold md:h-11' }} />
          <TextareaField name="lead" label="Chapô" rows={2} help="Une ou deux phrases qui résument la page." />
          <div>
            <p className="font-medium">
              Image principale <span className="font-normal text-secondary">(facultative)</span>
            </p>
            <p className="mt-1.5 flex items-center gap-2 rounded-lg border border-dashed border-border-input bg-sidebar p-3 text-[13px] text-secondary">
              <ImageIcon aria-hidden="true" className="size-4" />
              Le choix de l'image arrive avec la médiathèque.
            </p>
          </div>
          <div className="grid items-end gap-5 sm:grid-cols-[1fr_auto]">
            <div
              onInput={() => {
                slugTouched.current = true;
              }}
            >
              <TextField name="slug" label="Adresse de la page" hideOptional prefix={`${siteHost(session?.site?.live_url, session?.site?.slug)}/`} help="Générée depuis le titre, modifiable." />
            </div>
            <div className="sm:pb-7">
              <SwitchField name="show_in_menu" label="Afficher dans le menu" />
            </div>
          </div>
        </FormSection>

        <BlockEditor name="blocks" />

        <details className="rounded-xl border border-border bg-surface p-5 dark:bg-sidebar">
          <summary className="cursor-pointer font-semibold">Référencement</summary>
          <div className="mt-4">
            <TextareaField name="meta_description" label="Description pour les moteurs de recherche" rows={2} help="160 caractères au plus. Par défaut, le chapô est utilisé." />
          </div>
        </details>
      </div>
      </div>
      {previewShown && (
        <div className="sticky top-[117px] hidden h-[calc(100dvh-117px)] min-[1200px]:flex" style={{ width: previewWidth }}>
          <ResizeHandle
            width={previewWidth}
            min={380}
            max={900}
            onChange={(width) => {
              setPreviewWidth(width);
              localStorageSet('communeo.preview.width', String(width));
            }}
          />
          <aside aria-label="Aperçu du brouillon" className="min-w-0 flex-1 bg-surface dark:bg-sidebar">
            <PreviewView state={previewState} onReload={reloadPreview} onFullscreen={() => setDialog('preview-fullscreen')} onHide={() => togglePreview(false)} />
          </aside>
        </div>
      )}
      </div>

      <PreviewDrawer open={dialog === 'preview-drawer'} onOpenChange={(open) => setDialog(open ? 'preview-drawer' : null)} state={previewState} onReload={reloadPreview} onFullscreen={() => setDialog('preview-fullscreen')} />
      <PreviewFullscreen open={dialog === 'preview-fullscreen'} onOpenChange={(open) => setDialog(open ? 'preview-fullscreen' : null)} state={previewState} onReload={reloadPreview} />
      <ScheduleDialog open={dialog === 'schedule'} onOpenChange={(open) => setDialog(open ? 'schedule' : null)} onSchedule={schedule} />
      <ConfirmDialog
        open={dialog === 'delete'}
        onOpenChange={(open) => !open && setDialog(null)}
        title={`Supprimer « ${title} » ?`}
        description="La page sera retirée du site à la prochaine mise en ligne. Cette action est définitive."
        confirmLabel="Supprimer"
        onConfirm={remove}
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

// Garde exportée pour les écrans qui n'enregistrent pas automatiquement
export { UnsavedChangesGuard };
