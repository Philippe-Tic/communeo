/**
 * Réseaux sociaux (handoff 6.10, ticket #143) : liste courte, un lien par plateforme, ajout par
 * sélection dans une liste fermée (« Autre » demande un nom). Les liens apparaissent dans le pied
 * de page du site ; une ligne laissée vide n'est pas enregistrée.
 */
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { useFieldArray, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormSection, TextField } from '@/components/form';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SiteSettings, SocialLink } from '@/lib/site-settings';
import { SettingsScreen } from './settings-screen';
import { useSettingsForm } from './use-settings-form';

const FORM_ID = 'reglages-reseaux';

type Platform = SocialLink['platform'];

export const PLATFORMS: Array<{ id: Platform; label: string; example: string }> = [
  { id: 'facebook', label: 'Facebook', example: 'facebook.com/mairie' },
  { id: 'instagram', label: 'Instagram', example: 'instagram.com/mairie' },
  { id: 'youtube', label: 'YouTube', example: 'youtube.com/@mairie' },
  { id: 'linkedin', label: 'LinkedIn', example: 'linkedin.com/company/mairie' },
  { id: 'x', label: 'X', example: 'x.com/mairie' },
  { id: 'tiktok', label: 'TikTok', example: 'tiktok.com/@mairie' },
  { id: 'autre', label: 'Autre', example: 'https://' },
];

const labelOf = (platform: Platform) => PLATFORMS.find((entry) => entry.id === platform)!.label;

/** « facebook.com/mairie » → « https://facebook.com/mairie » */
export const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  return !trimmed || /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const isUrl = (value: string) => {
  try {
    const url = new URL(normalizeUrl(value));
    return /^https?:$/.test(url.protocol) && url.hostname.includes('.');
  } catch {
    return false;
  }
};

const schema = z.object({
  links: z.array(
    z
      .object({
        platform: z.custom<Platform>(),
        url: z
          .string()
          .trim()
          .max(500, "L'adresse ne doit pas dépasser 500 caractères")
          .refine((value) => !value || isUrl(value), 'Indiquez l’adresse de la page, par exemple facebook.com/mairie'),
        label: z.string().trim().max(50, 'Le nom ne doit pas dépasser 50 caractères'),
      })
      .refine((link) => link.platform !== 'autre' || !link.url || !!link.label, {
        message: 'Indiquez le nom du réseau',
        path: ['label'],
      }),
  ),
});

type Values = z.infer<typeof schema>;

function toValues(site: SiteSettings): Values {
  const links = (site.social_links ?? []).map((link) => ({
    platform: link.platform,
    url: link.url ?? '',
    label: link.label ?? '',
  }));
  // Aucune page encore : les deux plateformes les plus utilisées par les communes, à compléter
  return {
    links: links.length
      ? links
      : [
          { platform: 'facebook', url: '', label: '' },
          { platform: 'instagram', url: '', label: '' },
        ],
  };
}

function toPayload(values: Values) {
  const social_links = values.links
    .filter((link) => link.url.trim())
    .map((link) => ({
      platform: link.platform,
      url: normalizeUrl(link.url),
      label: link.platform === 'autre' ? link.label.trim() || null : null,
    }));
  return { data: { social_links }, cached: { social_links } };
}

function SocialLinks() {
  const { fields, append, remove } = useFieldArray<Values, 'links'>({ name: 'links' });
  const links = (useWatch<Values, 'links'>({ name: 'links' }) ?? []) as Values['links'];
  const used = new Set(links.map((link) => link.platform));
  const available = PLATFORMS.filter((platform) => platform.id === 'autre' || !used.has(platform.id));
  // Plateforme ajoutée : le focus va à son champ quand le menu se ferme (au lieu du bouton)
  const added = useRef<number | null>(null);

  return (
    <>
      {fields.length > 0 && (
        <ul className="space-y-3">
          {fields.map((field, index) => {
            const platform = links[index]?.platform ?? field.platform;
            const name = platform === 'autre' ? links[index]?.label.trim() || 'Autre réseau' : labelOf(platform);
            return (
              <li
                key={field.id}
                data-social={index}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-3"
              >
                {platform === 'autre' && (
                  <TextField
                    name={`links.${index}.label`}
                    label="Nom du réseau"
                    hideOptional
                    className="col-span-2"
                    help="Ex. « Mastodon », « WhatsApp »."
                  />
                )}
                <TextField
                  name={`links.${index}.url`}
                  label={platform === 'autre' ? 'Adresse de la page' : name}
                  hideOptional
                  inputProps={{
                    placeholder: PLATFORMS.find((entry) => entry.id === platform)!.example,
                    autoComplete: 'off',
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Retirer ${name}`}
                  title="Retirer"
                  className="mt-[30px] size-11 text-secondary md:mt-[29px] md:size-10"
                  onClick={() => {
                    remove(index);
                    requestAnimationFrame(() => document.getElementById('ajout-reseau')?.focus());
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button id="ajout-reseau" type="button" variant="secondary" className="max-md:h-11">
              <Plus aria-hidden="true" />
              Ajouter une plateforme
              <ChevronDown aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            onCloseAutoFocus={(event) => {
              if (added.current === null) return;
              event.preventDefault();
              document.querySelector<HTMLInputElement>(`[data-social="${added.current}"] input`)?.focus();
              added.current = null;
            }}
          >
            {available.map((platform) => (
              <DropdownMenuItem
                key={platform.id}
                onSelect={() => {
                  added.current = fields.length;
                  append({ platform: platform.id, url: '', label: '' }, { shouldFocus: false });
                }}
              >
                {platform.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <p className="text-[13px] text-secondary">
          {available
            .filter((platform) => platform.id !== 'autre')
            .map((platform) => platform.label)
            .concat('autre')
            .join(', ')}
        </p>
      </div>
    </>
  );
}

export function SocialScreen({ site }: { site: SiteSettings }) {
  const { form, onSubmit, screen } = useSettingsForm({
    site,
    title: 'Réseaux sociaux',
    schema,
    toValues,
    toPayload,
    saved: 'Réseaux sociaux enregistrés. Ils seront en ligne à la prochaine mise en ligne du site.',
    failed: "Les réseaux sociaux n'ont pas pu être enregistrés",
  });
  return (
    <SettingsScreen id="reseaux" form={FORM_ID} {...screen}>
      <Form id={FORM_ID} form={form} className="space-y-6" requiredNote={false} onSubmit={onSubmit}>
        <FormSection title="Liens vers vos pages" fields={['links']}>
          <p className="text-secondary">
            Les liens renseignés apparaissent dans le pied de page du site. Laissez vide ce que vous n’utilisez pas.
          </p>
          <SocialLinks />
        </FormSection>
      </Form>
    </SettingsScreen>
  );
}
