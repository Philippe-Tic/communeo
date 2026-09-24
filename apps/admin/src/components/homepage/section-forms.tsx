/**
 * Formulaires des sections réglables de l'accueil, dépliés en place sous la ligne de la section.
 * Les autres sections (horaires, météo, collectes, perturbations, cantine, newsletter) n'ont rien à
 * régler ici : leur contenu vient des autres écrans.
 */
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Building2,
  Calendar,
  ChevronDown,
  Clock,
  FileText,
  Folder,
  Globe,
  Heart,
  IdCard,
  Info,
  Mail,
  Map as MapIcon,
  Phone,
  Plus,
  Shield,
  Star,
  Trash2,
  Trees,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { HOMEPAGE_LIMITS, type RichTextDocument } from '@communeo/core';
import { RichTextField } from '@/components/blocks/rich-text';
import { controlClass, fieldId, TextField } from '@/components/form';
import { ImageField } from '@/components/media/media-fields';
import { Button } from '@/components/ui/button';
import { KEY_FIGURE_ICONS, QUICK_LINK_ICONS, type HomepageValues } from '@/lib/homepage';
import { imageSchema, type LibraryFile } from '@/lib/media-library';
import { cn } from '@/lib/utils';
import { LinkField } from './link-field';

// --- Validation (avant chaque enregistrement automatique) -----------------------------------------

const SAFE_URL = /^(https?:\/\/\S+\.\S+|mailto:\S+|tel:[+\d]|\/(?!\/))/i;
const max = (length: number, what: string) =>
  z.string().max(length, `${what} ne doit pas dépasser ${length} caractères`);
const link = z
  .string()
  .trim()
  .refine(
    (value) => !value || SAFE_URL.test(value),
    'Indiquez une adresse commençant par https:// ou une page du site',
  );

const button = (which: 'principal' | 'secondaire') =>
  z.object({ label: max(60, 'Le texte du bouton'), url: link }).superRefine((value, ctx) => {
    if (value.url && !value.label.trim())
      ctx.addIssue({ code: 'custom', path: ['label'], message: `Indiquez le texte du bouton ${which}` });
    if (value.label.trim() && !value.url)
      ctx.addIssue({ code: 'custom', path: ['url'], message: `Choisissez la page du bouton ${which}` });
  });

export const homepageSchema = z
  .object({
    hero: z.object({
      enabled: z.boolean(),
      title: max(120, 'Le titre'),
      subtitle: max(300, 'Le sous-titre'),
      image: imageSchema,
      primary_label: z.string(),
      primary_url: z.string(),
      secondary_label: z.string(),
      secondary_url: z.string(),
    }),
    quick_links: z.object({
      enabled: z.boolean(),
      items: z
        .array(
          z.object({
            label: z
              .string()
              .trim()
              .min(1, 'Indiquez le libellé de l’accès rapide')
              .max(50, 'Le libellé ne doit pas dépasser 50 caractères'),
            url: z.string().trim().min(1, 'Choisissez la page de l’accès rapide').pipe(link),
            description: max(100, 'La description'),
            icon: z.string(),
          }),
        )
        .max(HOMEPAGE_LIMITS.quickLinks.max),
    }),
    featured_news: z.object({ enabled: z.boolean(), count: z.number() }),
    agenda: z.object({ enabled: z.boolean(), count: z.number() }),
    associations: z.object({ enabled: z.boolean(), count: z.number() }),
    mayor_word: z.object({
      enabled: z.boolean(),
      title: max(120, 'Le titre'),
      body: z.custom<RichTextDocument>(),
      photo: imageSchema,
      signature_name: max(120, 'Le nom'),
      signature_role: max(120, 'La fonction'),
    }),
    key_figures: z.object({
      enabled: z.boolean(),
      items: z
        .array(
          z.object({
            value: z
              .string()
              .trim()
              .min(1, 'Indiquez le chiffre')
              .max(20, 'Le chiffre ne doit pas dépasser 20 caractères'),
            label: z
              .string()
              .trim()
              .min(1, 'Indiquez ce que compte ce chiffre')
              .max(60, 'Le libellé ne doit pas dépasser 60 caractères'),
            icon: z.string(),
          }),
        )
        .max(HOMEPAGE_LIMITS.keyFigures.max),
    }),
    partners: z.object({
      enabled: z.boolean(),
      items: z
        .array(
          z.object({
            name: z
              .string()
              .trim()
              .min(1, 'Indiquez le nom du partenaire')
              .max(100, 'Le nom ne doit pas dépasser 100 caractères'),
            logo: z.custom<LibraryFile | null>(),
            url: link,
          }),
        )
        .max(12),
    }),
    free_content: z.object({ enabled: z.boolean(), title: max(120, 'Le titre'), body: z.custom<RichTextDocument>() }),
    practical_info: z.object({ enabled: z.boolean() }),
    weather: z.object({ enabled: z.boolean() }),
    waste_collection: z.object({ enabled: z.boolean() }),
    disruptions: z.object({ enabled: z.boolean() }),
    canteen: z.object({ enabled: z.boolean() }),
    newsletter: z.object({ enabled: z.boolean() }),
    meta_description: max(160, 'La description'),
  })
  .superRefine((values, ctx) => {
    for (const [which, prefix] of [
      ['principal', 'primary'],
      ['secondaire', 'secondary'],
    ] as const) {
      const result = button(which).safeParse({
        label: values.hero[`${prefix}_label`],
        url: values.hero[`${prefix}_url`],
      });
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({
            code: 'custom',
            message: issue.message,
            path: ['hero', issue.path[0] === 'label' ? `${prefix}_label` : `${prefix}_url`],
          });
        }
      }
    }
  });

// --- Éléments communs -----------------------------------------------------------------------------

const ICONS: Record<string, LucideIcon> = {
  document: FileText,
  identity: IdCard,
  folder: Folder,
  mail: Mail,
  alert: TriangleAlert,
  clock: Clock,
  phone: Phone,
  map: MapIcon,
  calendar: Calendar,
  users: Users,
  building: Building2,
  heart: Heart,
  info: Info,
  shield: Shield,
  book: BookOpen,
  globe: Globe,
  tree: Trees,
  star: Star,
};

function IconSelect({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  const { register } = useFormContext();
  const value = useWatch({ name }) as string;
  const Icon = value ? ICONS[value] : null;
  const id = fieldId(name);
  return (
    <div className="flex items-end gap-2">
      <span
        aria-hidden="true"
        className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand md:size-10"
      >
        {Icon ? <Icon className="size-5" /> : <span className="text-[11px] text-secondary">—</span>}
      </span>
      <div className="relative min-w-0 flex-1">
        <label htmlFor={id} className="mb-1.5 block font-medium">
          {label}
        </label>
        <select id={id} {...register(name)} className={cn(controlClass, 'h-11 appearance-none pr-8 md:h-10')}>
          <option value="">Sans icône</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 bottom-3.5 size-4 text-secondary md:bottom-3"
        />
      </div>
    </div>
  );
}

/** Carte d'un élément répété : Monter, Descendre, Retirer */
function ItemCard({
  index,
  count,
  name,
  onMove,
  onRemove,
  children,
}: {
  index: number;
  count: number;
  name: string;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <li className="rounded-lg border border-border p-3" data-item={index}>
      <div className="mb-2 flex items-center gap-1">
        <p className="flex-1 text-[13px] font-semibold text-secondary">{name}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 md:size-8"
          aria-label={`Monter ${name}`}
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
        >
          <ArrowUp aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 md:size-8"
          aria-label={`Descendre ${name}`}
          disabled={index === count - 1}
          onClick={() => onMove(index, index + 1)}
        >
          <ArrowDown aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 text-danger md:size-8"
          aria-label={`Retirer ${name}`}
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
      <div className="grid gap-3">{children}</div>
    </li>
  );
}

/**
 * Éléments répétés. Le focus suit l'élément ajouté (son premier champ) ou déplacé (son bouton),
 * posé juste après le rendu qui le crée : pas d'image différée qui le reprendrait pendant la saisie.
 */
function useItems<T extends 'quick_links.items' | 'key_figures.items' | 'partners.items'>(name: T) {
  const { fields, append, remove, move } = useFieldArray<HomepageValues, T>({ name });
  // `index: null` : le bouton d'ajout (réactivé par le rendu quand la liste était pleine)
  const pending = useRef<{ index: number | null; selector: string } | null>(null);
  useLayoutEffect(() => {
    if (!pending.current) return;
    const { index, selector } = pending.current;
    pending.current = null;
    const target =
      index === null
        ? document.querySelector<HTMLElement>(`[data-add="${name}"]`)
        : document.querySelector(`[data-list="${name}"] [data-item="${index}"]`)?.querySelector<HTMLElement>(selector);
    target?.focus();
  });
  return {
    fields,
    add: (value: Parameters<typeof append>[0]) => {
      pending.current = { index: fields.length, selector: 'input, select' };
      append(value, { shouldFocus: false });
    },
    remove: (index: number) => {
      pending.current = { index: null, selector: '' };
      remove(index);
    },
    move: (from: number, to: number) => {
      pending.current = {
        index: to,
        selector: `button[aria-label^="${to < from ? 'Monter' : 'Descendre'}"]:not(:disabled), button[aria-label^="Retirer"]`,
      };
      move(from, to);
    },
  };
}

// --- Sections -------------------------------------------------------------------------------------

export function HeroForm() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="hero.title" label="Titre" help="Vide : « Bienvenue à … »." />
        <TextField name="hero.subtitle" label="Sous-titre" />
      </div>
      <ImageField name="hero.image" label="Image" folder="Accueil" />
      <div className="grid gap-4 sm:grid-cols-2">
        {(['primary', 'secondary'] as const).map((prefix) => (
          <fieldset key={prefix} className="grid gap-3 rounded-lg border border-border p-3">
            <legend className="px-1 font-medium">
              {prefix === 'primary' ? 'Bouton principal' : 'Bouton secondaire'}
            </legend>
            <TextField name={`hero.${prefix}_label`} label="Texte du bouton" />
            <LinkField name={`hero.${prefix}_url`} label="Page du bouton" />
          </fieldset>
        ))}
      </div>
    </>
  );
}

export function QuickLinksForm() {
  const { fields, add, remove, move } = useItems('quick_links.items');
  const labels = (useWatch({ name: 'quick_links.items' }) as HomepageValues['quick_links']['items'] | undefined) ?? [];
  const full = fields.length >= HOMEPAGE_LIMITS.quickLinks.max;
  return (
    <>
      {fields.length > 0 && (
        <ol className="space-y-2" data-list="quick_links.items">
          {fields.map((field, index) => (
            <ItemCard
              key={field.id}
              index={index}
              count={fields.length}
              name={`Accès ${index + 1}${labels[index]?.label.trim() ? ` « ${labels[index]!.label.trim()} »` : ''}`}
              onMove={move}
              onRemove={() => remove(index)}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField name={`quick_links.items.${index}.label`} label="Libellé" required />
                <TextField
                  name={`quick_links.items.${index}.description`}
                  label="Description"
                  help="Ex. « Actes, mariage, PACS »."
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <LinkField name={`quick_links.items.${index}.url`} label="Page" />
                <IconSelect name={`quick_links.items.${index}.icon`} label="Icône" options={QUICK_LINK_ICONS} />
              </div>
            </ItemCard>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          data-add="quick_links.items"
          disabled={full}
          className="max-md:h-11"
          onClick={() => add({ label: '', url: '', description: '', icon: '' })}
        >
          <Plus aria-hidden="true" />
          Ajouter un accès rapide
        </Button>
        <p className="text-[13px] text-secondary">
          {fields.length} sur {HOMEPAGE_LIMITS.quickLinks.max} au maximum
          {fields.length < HOMEPAGE_LIMITS.quickLinks.min &&
            ` · ${HOMEPAGE_LIMITS.quickLinks.min} au moins pour une rangée complète`}
        </p>
      </div>
    </>
  );
}

const COUNTS = Array.from({ length: HOMEPAGE_LIMITS.listing.max }, (_, index) => ({
  value: String(index + 1),
  label: String(index + 1),
}));

export function ListingForm({
  section,
  label,
}: {
  section: 'featured_news' | 'agenda' | 'associations';
  label: string;
}) {
  const { register } = useFormContext();
  const id = fieldId(`${section}.count`);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          {...register(`${section}.count`, { valueAsNumber: true })}
          className={cn(controlClass, 'h-11 w-20 appearance-none pr-8 md:h-10')}
        >
          {COUNTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-secondary"
        />
      </div>
    </div>
  );
}

export function MayorWordForm() {
  return (
    <>
      <TextField name="mayor_word.title" label="Titre" help="Vide : « Le mot du maire »." />
      <RichTextField
        name="mayor_word.body"
        label="Texte"
        headings={false}
        help="Rien n'est affiché tant que le texte est vide."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="mayor_word.signature_name" label="Signature" help="Ex. « Claire Martin »." />
        <TextField name="mayor_word.signature_role" label="Fonction" help="Ex. « Maire de la commune »." />
      </div>
      <ImageField name="mayor_word.photo" label="Photo" folder="Équipe municipale" />
    </>
  );
}

export function KeyFiguresForm() {
  const { fields, add, remove, move } = useItems('key_figures.items');
  const values = (useWatch({ name: 'key_figures.items' }) as HomepageValues['key_figures']['items'] | undefined) ?? [];
  const full = fields.length >= HOMEPAGE_LIMITS.keyFigures.max;
  return (
    <>
      {fields.length > 0 && (
        <ol className="space-y-2" data-list="key_figures.items">
          {fields.map((field, index) => (
            <ItemCard
              key={field.id}
              index={index}
              count={fields.length}
              name={`Chiffre ${index + 1}${values[index]?.label.trim() ? ` « ${values[index]!.label.trim()} »` : ''}`}
              onMove={move}
              onRemove={() => remove(index)}
            >
              <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                <TextField name={`key_figures.items.${index}.value`} label="Chiffre" required help="Ex. « 3 240 »." />
                <TextField
                  name={`key_figures.items.${index}.label`}
                  label="Ce qu'il compte"
                  required
                  help="Ex. « habitants »."
                />
              </div>
              <IconSelect name={`key_figures.items.${index}.icon`} label="Icône" options={KEY_FIGURE_ICONS} />
            </ItemCard>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          data-add="key_figures.items"
          disabled={full}
          className="max-md:h-11"
          onClick={() => add({ value: '', label: '', icon: '' })}
        >
          <Plus aria-hidden="true" />
          Ajouter un chiffre
        </Button>
        <p className="text-[13px] text-secondary">
          {HOMEPAGE_LIMITS.keyFigures.min} à {HOMEPAGE_LIMITS.keyFigures.max} chiffres
        </p>
      </div>
    </>
  );
}

export function PartnersForm() {
  const { fields, add, remove, move } = useItems('partners.items');
  const values = (useWatch({ name: 'partners.items' }) as HomepageValues['partners']['items'] | undefined) ?? [];
  return (
    <>
      {fields.length > 0 && (
        <ol className="space-y-2" data-list="partners.items">
          {fields.map((field, index) => (
            <ItemCard
              key={field.id}
              index={index}
              count={fields.length}
              name={values[index]?.name.trim() || `Partenaire ${index + 1}`}
              onMove={move}
              onRemove={() => remove(index)}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField name={`partners.items.${index}.name`} label="Nom" required />
                <TextField
                  name={`partners.items.${index}.url`}
                  label="Site du partenaire"
                  inputProps={{ type: 'url', placeholder: 'https://' }}
                />
              </div>
              <ImageField
                name={`partners.items.${index}.logo`}
                label="Logo"
                folder="Logos et blasons"
                describe={false}
                help="Le nom du partenaire sert de texte alternatif."
              />
            </ItemCard>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          data-add="partners.items"
          disabled={fields.length >= 12}
          className="max-md:h-11"
          onClick={() => add({ name: '', logo: null, url: '' })}
        >
          <Plus aria-hidden="true" />
          Ajouter un partenaire
        </Button>
        <p className="text-[13px] text-secondary">{fields.length} sur 12 au maximum</p>
      </div>
    </>
  );
}

export function FreeContentForm() {
  return (
    <>
      <TextField name="free_content.title" label="Titre" help="Vide : « Découvrir … »." />
      <RichTextField name="free_content.body" label="Texte" help="Rien n'est affiché tant que le texte est vide." />
    </>
  );
}
