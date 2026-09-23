/**
 * Formulaire d'un écran de réglages : valeurs initiales depuis le Site, enregistrement explicite,
 * état « non enregistré », enregistrement depuis la fenêtre de sortie. Les props renvoyées vont
 * au gabarit (<SettingsScreen>) et au <Form>.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { DefaultValues, FieldValues } from 'react-hook-form';
import type { z } from 'zod';
import { useZodForm } from '@/components/form';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { focusHeadingIfRequested } from '@/lib/focus';
import { saveSiteSettings, type SiteSettings } from '@/lib/site-settings';

export function useSettingsForm<I extends FieldValues, V extends FieldValues>({
  site,
  title,
  schema,
  toValues,
  toPayload,
  saved,
  failed,
}: {
  site: SiteSettings;
  title: string;
  schema: z.ZodType<V, I>;
  toValues: (site: SiteSettings) => I;
  /** `data` : envoyé au serveur ; `cached` : repris dans le cache de l'admin (fichiers entiers) */
  toPayload: (values: V, site: SiteSettings) => { data: Record<string, unknown>; cached?: Partial<SiteSettings> };
  /** Message de réussite, ex. « Mentions légales enregistrées. Elles seront en ligne à la prochaine mise en ligne du site. » */
  saved: string;
  /** Début du message d'échec, ex. « Les mentions légales n'ont pas pu être enregistrées » */
  failed: string;
}) {
  const client = useQueryClient();
  const form = useZodForm(schema, toValues(site) as DefaultValues<I>);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(site.updatedAt);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => focusHeadingIfRequested(heading.current), []);
  useEffect(() => {
    document.title = `${title} · Communeo`;
  }, [title]);

  const save = async (values: V): Promise<boolean> => {
    setSaving(true);
    try {
      const { data, cached } = toPayload(values, site);
      await saveSiteSettings(client, site.documentId, data, cached ?? (data as Partial<SiteSettings>));
      form.reset(values as unknown as I);
      setSavedAt(new Date().toISOString());
      toast.success(saved);
      return true;
    } catch (error) {
      toast.error(`${failed} : ${error instanceof ApiError ? error.message : 'erreur inattendue'}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Depuis la fenêtre « modifications non enregistrées » : validation puis enregistrement
  const saveFromGuard = async () => {
    let ok = false;
    await form.handleSubmit(async (values) => {
      ok = await save(values);
    })();
    return ok;
  };

  return {
    form,
    onSubmit: (values: V) => void save(values),
    screen: {
      site,
      title,
      headingRef: heading,
      dirty: form.formState.isDirty,
      saving,
      savedAt,
      onCancel: () => form.reset(),
      onSave: saveFromGuard,
    },
  };
}
