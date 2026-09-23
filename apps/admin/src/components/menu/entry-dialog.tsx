/**
 * Ajouter ou modifier une entrée du menu : une page du site, une rubrique (Actualités, Agenda…),
 * un lien externe, ou un groupe (sous-menu, menu principal seulement).
 */
import { Dialog } from 'radix-ui';
import { useEffect, useRef } from 'react';
import { useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Form, RadioGroupField, SelectField, TextField, useZodForm } from '@/components/form';
import { Button } from '@/components/ui/button';
import { dialogContentClass, useReturnFocus } from '@/components/ui/confirm-dialog';
import type { PageSummary } from '@/lib/site-settings';
import { cn } from '@/lib/utils';
import { newKey, SECTION_OPTIONS, type MenuEntry } from './model';

const SAFE_URL = /^(https?:\/\/|mailto:|tel:)/i;

const schema = z
  .object({
    type: z.enum(['page', 'section', 'external', 'group']),
    pageDocumentId: z.string(),
    section: z.string(),
    url: z.string(),
    label: z.string().max(60, 'Le libellé fait au plus 60 caractères'),
  })
  .superRefine((values, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
    if (values.type === 'page' && !values.pageDocumentId) issue('pageDocumentId', 'Choisissez une page');
    if (values.type === 'section' && !values.section) issue('section', 'Choisissez une rubrique');
    if (values.type === 'external') {
      if (!values.url.trim()) issue('url', "Indiquez l'adresse du lien");
      else if (!SAFE_URL.test(values.url.trim())) issue('url', "L'adresse doit commencer par https://, mailto: ou tel:");
      if (!values.label.trim()) issue('label', 'Indiquez le libellé du lien');
    }
    if (values.type === 'group' && !values.label.trim()) issue('label', 'Indiquez le nom du groupe');
  });

type Values = z.input<typeof schema>;

const TYPE_OPTIONS = [
  { value: 'page', label: 'Page', description: 'Une page du site (Horaires de la mairie, Location de la salle…).' },
  { value: 'section', label: 'Rubrique', description: 'Une partie du site : Actualités, Agenda, Démarches…' },
  { value: 'external', label: 'Lien externe', description: 'Un autre site, une adresse e-mail ou un numéro de téléphone.' },
  { value: 'group', label: 'Groupe', description: 'Un titre qui ouvre un sous-menu, sans page à lui.' },
];

function toValues(entry: MenuEntry | null): Values {
  return {
    type: entry?.type ?? 'page',
    pageDocumentId: entry?.type === 'page' ? entry.pageDocumentId : '',
    section: entry?.type === 'section' ? entry.section : '',
    url: entry?.type === 'external' ? entry.url : '',
    label: entry?.label ?? '',
  };
}

function toEntry(values: z.output<typeof schema>, key: string, previous: MenuEntry | null): MenuEntry {
  const label = values.label.trim();
  if (values.type === 'page') return { key, type: 'page', pageDocumentId: values.pageDocumentId, label };
  if (values.type === 'section') return { key, type: 'section', section: values.section as never, label };
  if (values.type === 'external') return { key, type: 'external', url: values.url.trim(), label };
  return { key, type: 'group', label, children: previous?.type === 'group' ? previous.children : [] };
}

export function EntryDialog({
  open,
  onOpenChange,
  entry,
  title,
  allowGroup,
  pages,
  unpublished,
  disabledSections,
  onSubmit,
  focusAfterSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Entrée modifiée, ou `null` pour en ajouter une */
  entry: MenuEntry | null;
  title: string;
  allowGroup: boolean;
  pages: PageSummary[];
  unpublished: Set<string>;
  disabledSections: Set<string>;
  onSubmit: (entry: MenuEntry) => void;
  /** Élément à focaliser après validation (l'entrée ajoutée ou modifiée), au lieu du déclencheur */
  focusAfterSubmit?: () => HTMLElement | null;
}) {
  const returnFocus = useReturnFocus();
  const submitted = useRef(false);
  const form = useZodForm(schema, toValues(entry));
  const type = useWatch({ control: form.control, name: 'type' });
  const pageId = useWatch({ control: form.control, name: 'pageDocumentId' });
  const section = useWatch({ control: form.control, name: 'section' });

  // Nouvelle ouverture : le formulaire reprend l'entrée
  useEffect(() => {
    if (open) form.reset(toValues(entry));
  }, [open, entry, form]);

  const defaultLabel = type === 'page' ? pages.find((page) => page.documentId === pageId)?.title : type === 'section' ? SECTION_OPTIONS.find((option) => option.key === section)?.label : undefined;
  const typeOptions = TYPE_OPTIONS.filter((option) => option.value !== 'group' || allowGroup || entry?.type === 'group');

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content
          className={cn(dialogContentClass, 'max-h-[calc(100dvh-32px)] max-w-[560px] overflow-y-auto')}
          onOpenAutoFocus={() => {
            submitted.current = false;
            returnFocus.onOpenAutoFocus();
          }}
          onCloseAutoFocus={(event) => {
            const target = submitted.current ? focusAfterSubmit?.() : null;
            if (target) {
              event.preventDefault();
              target.focus();
            } else returnFocus.onCloseAutoFocus(event);
          }}
        >
          <Dialog.Title className="text-[17px] font-semibold">{title}</Dialog.Title>
          <Dialog.Description className="mt-1 text-secondary">Le menu n'est modifié qu'une fois « Enregistrer » cliqué.</Dialog.Description>
          <Form
            form={form}
            requiredNote={false}
            className="mt-4 space-y-4"
            summaryTitle={(count) => `${count} champ${count > 1 ? 's' : ''} à compléter`}
            onSubmit={(values) => {
              submitted.current = true;
              onSubmit(toEntry(values, entry?.key ?? newKey(), entry));
              onOpenChange(false);
            }}
          >
            {/* Un groupe garde sa nature : ses sous-entrées n'auraient plus de place */}
            {entry?.type !== 'group' && <RadioGroupField name="type" label="Type d'entrée" cards options={typeOptions} hideOptional />}
            {type === 'page' && (
              <SelectField
                name="pageDocumentId"
                label="Page"
                required
                placeholder="Choisir une page"
                options={pages.map((page) => ({ value: page.documentId, label: unpublished.has(page.documentId) ? `${page.title} (brouillon)` : page.title }))}
                help={pageId && unpublished.has(pageId) ? "Cette page n'est pas publiée : elle apparaîtra dans le menu une fois publiée." : undefined}
              />
            )}
            {type === 'section' && (
              <SelectField
                name="section"
                label="Rubrique"
                required
                placeholder="Choisir une rubrique"
                options={SECTION_OPTIONS.map((option) => ({ value: option.key, label: disabledSections.has(option.key) ? `${option.label} (désactivée)` : option.label }))}
                help={section && disabledSections.has(section) ? "Rubrique désactivée pour votre commune : l'entrée n'apparaîtra pas." : undefined}
              />
            )}
            {type === 'external' && <TextField name="url" label="Adresse" required help="https://…, mailto:… ou tel:…" inputProps={{ type: 'url', inputMode: 'url', placeholder: 'https://' }} />}
            <TextField
              name="label"
              label={type === 'group' ? 'Nom du groupe' : 'Libellé'}
              required={type === 'external' || type === 'group'}
              help={defaultLabel ? `Par défaut : « ${defaultLabel} ».` : type === 'group' ? 'Par exemple « Vie pratique » ou « Mairie ».' : undefined}
              inputProps={{ placeholder: defaultLabel ?? '', maxLength: 60 }}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary">
                  Annuler
                </Button>
              </Dialog.Close>
              <Button type="submit">{entry ? 'Appliquer' : 'Ajouter'}</Button>
            </div>
          </Form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
