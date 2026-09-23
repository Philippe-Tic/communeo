/**
 * Éditeur de contenu (handoff 6.3 et 6.4), commun aux pages, actualités et événements : barre d'actions
 * (retour, titre et statut, enregistrement automatique, aperçu, Programmer, Publier, ⋯), formulaire du
 * type, aperçu du brouillon. Brouillon enregistré automatiquement ; publication et programmation
 * validées par le schéma du type.
 * - `layout: 'preview'` : aperçu en colonne à droite (pages, actualités, structure 1a) ;
 * - `layout: 'outline'` : formulaire en sections avec sommaire collant (événements, gabarit 6.4),
 *   aperçu en tiroir ou plein écran.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useBlocker, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Check, Clock, ExternalLink, Eye, Maximize2, MoreHorizontal, PanelRightOpen, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useWatch, type FieldValues, type UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import { slugify } from '@communeo/core';
import { describeBlockError, type Block } from '@/components/blocks';
import { PublicationBadge } from '@/components/content-list/publication-badge';
import { agree, newOf, type Noun } from '@/components/content-list/types';
import { Form, FormErrorSummary, TextField, useZodForm } from '@/components/form';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, UnsavedChangesDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import type { BaseDocument, DocumentApi, Draft } from '@/lib/content-api';
import { markRecent, refreshContent } from '@/lib/content-list';
import { usePendingUploads } from '@/lib/media';
import { formatShortParisDateTime } from '@/lib/dates';
import { focusHeadingIfRequested } from '@/lib/focus';
import { previewQuery, type PreviewTarget } from '@/lib/preview';
import { sessionQuery, themeName, type SessionUser } from '@/lib/session';
import { cn } from '@/lib/utils';
import { FormOutline, type OutlineSection } from './form-outline';
import { localStorageGet, localStorageSet, PreviewDrawer, PreviewFullscreen, PreviewView, ResizeHandle, type PreviewState } from './preview-panel';
import { SaveStatus } from './save-status';
import { ScheduleDialog } from './schedule-dialog';
import { useAutosave } from './use-autosave';

export interface EditorBodyProps<D extends BaseDocument> {
  documentId: string | null;
  draft: Draft<D> | undefined;
  session: SessionUser | undefined;
  /** Champ « Adresse » (préfixé du domaine, généré depuis le titre) */
  slugField: ReactNode;
}

export interface EditorConfig<D extends BaseDocument, V extends FieldValues> {
  api: DocumentApi<D, V>;
  previewType: Exclude<PreviewTarget['type'], 'home'>;
  /** Rubrique de l'admin : fil de la barre, retour, titre du document */
  section: { label: string; to: '/pages' | '/actualites' | '/agenda' | '/documents'; back: string };
  noun: Noun;
  /** Règles de publication (le brouillon, lui, s'enregistre tel quel) */
  schema: z.ZodType<V, V>;
  toValues: (doc: D | undefined, session: SessionUser | undefined) => V;
  /** Chemin du contenu sur le site public, à partir de son adresse */
  publicPath: (slug: string) => string;
  layout: 'preview' | 'outline';
  /** Valeurs posées par le serveur à la publication (date de publication…) à reprendre dans le formulaire */
  fromServer?: (doc: D) => Partial<V>;
  /** Sections du sommaire (layout « outline ») */
  outline?: OutlineSection[];
  Body: (props: EditorBodyProps<D>) => ReactNode;
}

const apiMessage = (error: unknown) => (error instanceof ApiError ? error.message : "Le serveur n'a pas répondu.");

function siteHost(liveUrl: string | null | undefined, slug: string | undefined) {
  try {
    return liveUrl ? new URL(liveUrl).host : `${slug ?? 'commune'}.communeo.fr`;
  } catch {
    return `${slug ?? 'commune'}.communeo.fr`;
  }
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function ContentEditor<D extends BaseDocument, V extends FieldValues & { title: string; slug: string }>({
  config,
  documentId: initialId,
  initial,
  onCreated,
}: {
  config: EditorConfig<D, V>;
  documentId: string | null;
  initial?: Draft<D>;
  onCreated: (doc: Draft<D>) => void;
}) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const { api, noun } = config;
  const { data: session } = useQuery(sessionQuery);
  const form = useZodForm(config.schema, config.toValues(initial, session) as never) as unknown as UseFormReturn<V>;
  const values = useWatch({ control: form.control }) as V;
  // Identifiant lu par les enregistrements (asynchrones) ; `documentId` sert au rendu
  const id = useRef(initialId);
  const [documentId, setDocumentId] = useState(initialId);
  const [doc, setDoc] = useState<Draft<D> | undefined>(initial);
  const [justPublished, setJustPublished] = useState(false);
  const [dialog, setDialog] = useState<'schedule' | 'delete' | 'preview-drawer' | 'preview-fullscreen' | null>(null);
  // Preview : rechargée après chaque enregistrement, panneau masquable et redimensionnable (mémorisés)
  const [version, setVersion] = useState(0);
  const [previewShown, setPreviewShown] = useState(() => localStorageGet('communeo.preview.shown') !== 'false');
  // 520 px par défaut, 420 px sous 1440 px (écran 1366 des maquettes)
  const [previewWidth, setPreviewWidth] = useState(() => Number(localStorageGet('communeo.preview.width')) || (window.innerWidth < 1440 ? 420 : 520));
  const slugTouched = useRef(!!initial?.published);
  const heading = useRef<HTMLHeadingElement>(null);
  const withPreviewPanel = config.layout === 'preview' && previewShown;
  // Un fichier en cours d'envoi : la publication attend qu'il soit arrivé
  const uploading = usePendingUploads() > 0;

  const remember = (next: Draft<D>) => {
    setDoc(next);
    setVersion((value) => value + 1);
    client.setQueryData(api.query(next.documentId).queryKey, next);
    if (!id.current) {
      id.current = next.documentId;
      setDocumentId(next.documentId);
      onCreated(next);
    }
  };

  const autosave = useAutosave<V>({
    values,
    // Un contenu neuf n'est enregistré qu'une fois titré
    enabled: !!documentId || (values.title ?? '').trim().length > 0,
    save: async (snapshot) => {
      const saved = await api.saveDraft(id.current, snapshot);
      // Brouillon d'un contenu en ligne : ses modifications ne sont pas encore publiées
      remember({ ...saved, published: doc?.published ?? false, modified: doc?.published ?? false });
      void refreshContent(client, api.type, { draftOnly: true });
      if (!snapshot.slug && saved.slug) form.setValue('slug' as never, saved.slug as never);
    },
  });

  // Adresse générée depuis le titre tant que le contenu n'a jamais été publié et qu'on ne l'a pas modifiée
  useEffect(() => {
    if (slugTouched.current) return;
    const generated = slugify(values.title ?? '');
    if (generated !== (form.getValues('slug' as never) as unknown)) form.setValue('slug' as never, generated as never);
  }, [values.title, form]);

  const title = values.title?.trim() || (documentId ? `${capitalize(noun.one)} sans titre` : newOf(noun));
  useEffect(() => {
    document.title = `${title} — ${config.section.label} · Communeo`;
  }, [title, config.section.label]);
  useEffect(() => focusHeadingIfRequested(heading.current), []);

  // Quitter l'éditeur : on enregistre d'abord ; la fenêtre ne s'ouvre que si l'enregistrement échoue
  const blocker = useBlocker({ shouldBlockFn: async () => !(await autosave.flush()), enableBeforeUnload: () => autosave.isDirty(), withResolver: true });

  const publish = async (valid: V) => {
    try {
      const published = await api.publish(id.current, valid);
      for (const [name, value] of Object.entries(config.fromServer?.(published) ?? {})) form.setValue(name as never, value as never);
      autosave.markSaved(form.getValues());
      remember({ ...published, published: true, modified: false, scheduled_at: null });
      markRecent(api.type, published.documentId);
      void refreshContent(client, api.type);
      setJustPublished(true);
      setTimeout(() => setJustPublished(false), 3000);
      slugTouched.current = true;
      const url = session?.site?.live_url;
      toast.success(
        `« ${published.title} » est ${agree(noun, 'publié', 1)}. Votre site sera mis à jour dans quelques instants.`,
        url ? { label: 'Voir sur le site', onClick: () => window.open(`${url.replace(/\/$/, '')}${config.publicPath(published.slug)}`, '_blank', 'noopener') } : undefined,
      );
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
    const scheduled = await api.schedule(id.current, form.getValues(), at);
    autosave.markSaved(form.getValues());
    remember({ ...scheduled, published: doc?.published ?? false, modified: doc?.published ?? false });
    markRecent(api.type, scheduled.documentId);
    void refreshContent(client, api.type);
    toast.success(`Publication programmée le ${formatShortParisDateTime(at)}.`);
  };

  const remove = async () => {
    if (id.current) await api.remove(id.current);
    autosave.markSaved(form.getValues());
    void refreshContent(client, api.type);
    toast.success(`« ${title} » a été ${agree(noun, 'supprimé', 1)}.`);
    await navigate({ to: config.section.to });
  };

  const preview = useQuery(previewQuery(documentId ? { type: config.previewType, documentId } : null, { slug: doc?.slug }));
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

  const status = <PublicationBadge state={doc?.published ? (doc.modified ? 'modified' : 'published') : 'draft'} scheduledAt={doc?.scheduled_at} />;
  const liveUrl = session?.site?.live_url?.replace(/\/$/, '');

  const slugField = (
    <div
      onInput={() => {
        slugTouched.current = true;
      }}
    >
      <TextField name="slug" label={`Adresse ${noun.feminine ? 'de la' : 'du'} ${noun.one}`} hideOptional prefix={`${siteHost(session?.site?.live_url, session?.site?.slug)}${config.publicPath('')}`} help="Générée depuis le titre, modifiable." />
    </div>
  );

  const Body = config.Body;
  const summaryTitle = (count: number) => `${count} erreur${count > 1 ? 's empêchent' : ' empêche'} la publication`;
  const describeError = (name: string, message: string) => describeBlockError(name, message, ((form.getValues('blocks' as never) as unknown) ?? []) as Block[]);

  return (
    <Form
      form={form}
      onSubmit={publish}
      className="-mx-4 -mt-6 md:-mx-8 md:-mt-7"
      requiredNote={false}
      summary={false}
    >
      {/* Barre d'actions */}
      <div className="sticky top-14 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-surface px-4 py-2.5 md:px-8 dark:bg-sidebar">
        <Button asChild variant="ghost" size="icon" aria-label={config.section.back}>
          <Link to={config.section.to}>
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1 max-md:basis-[calc(100%-56px)]">
          <p className="text-xs text-secondary">{config.section.label}</p>
          {/* Le statut ne se comprime jamais : il passe sous le titre s'il manque de place (mobile) */}
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h1 ref={heading} className="max-w-full truncate text-[15px] leading-tight font-semibold tracking-normal outline-none">
              {title}
            </h1>
            <span className="shrink-0 whitespace-nowrap">{status}</span>
          </div>
        </div>
        <SaveStatus state={autosave.state} onRetry={() => void autosave.flush()} />
        {/* Actions : dans la barre sur ordinateur, fixées en bas de l'écran sur mobile */}
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-border bg-surface p-3 md:static md:z-auto md:border-0 md:bg-transparent md:p-0 dark:bg-sidebar md:dark:bg-transparent">
          {/* Aperçu : plein écran sur mobile, tiroir sous 1200 px (ou sans colonne d'aperçu), panneau au-delà */}
          <Button type="button" variant="secondary" className="max-md:h-11 max-md:flex-1 md:hidden" onClick={() => setDialog('preview-fullscreen')}>
            <Eye aria-hidden="true" />
            Aperçu
          </Button>
          <Button type="button" variant="tertiary" className={cn('hidden', config.layout === 'preview' ? 'md:max-[1199px]:inline-flex' : 'md:inline-flex')} onClick={() => setDialog('preview-drawer')}>
            <Eye aria-hidden="true" />
            Aperçu
          </Button>
          {config.layout === 'preview' &&
            (previewShown ? (
              <Button type="button" variant="tertiary" className="hidden min-[1200px]:inline-flex" onClick={() => setDialog('preview-fullscreen')}>
                <Maximize2 aria-hidden="true" />
                Aperçu plein écran
              </Button>
            ) : (
              <Button type="button" variant="tertiary" className="hidden min-[1200px]:inline-flex" onClick={() => togglePreview(true)}>
                <PanelRightOpen aria-hidden="true" />
                Afficher l'aperçu
              </Button>
            ))}
          <Button type="button" variant="secondary" className="max-md:h-11 max-md:flex-1" onClick={() => setDialog('schedule')}>
            <Clock aria-hidden="true" />
            Programmer
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting || uploading} className={cn('max-md:h-11 max-md:flex-1', justPublished && 'bg-success text-white hover:bg-success')}>
            {uploading ? (
              'Envoi du fichier…'
            ) : justPublished ? (
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
              {doc?.published && liveUrl && (
                <DropdownMenuItem asChild>
                  <a href={`${liveUrl}${config.publicPath(doc.slug)}`} target="_blank" rel="noreferrer">
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
          <div className={cn('mx-auto px-4 pt-6 pb-28 md:px-8 md:py-7', config.layout === 'outline' ? 'flex max-w-[1040px] items-start gap-10' : 'max-w-[760px]')}>
            <div className={cn('min-w-0 space-y-6', config.layout === 'outline' && 'max-w-[760px] flex-1')}>
              <FormErrorSummary title={summaryTitle} describe={describeError} />
              <Body documentId={documentId} draft={doc} session={session} slugField={slugField} />
            </div>
            {config.layout === 'outline' && config.outline && <FormOutline sections={config.outline} />}
          </div>
        </div>
        {withPreviewPanel && (
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
        description={`Cette action est définitive. ${capitalize(noun.definite)} disparaîtra du site à la prochaine mise en ligne.`}
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
