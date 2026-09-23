/**
 * « Afficher dans le menu » (éditeur de page, handoff 6.3) : ajoute la page à la fin du menu
 * principal ou l'en retire, tout de suite (réglage du Site, visible à la prochaine mise en ligne).
 * Le menu lui-même s'organise dans « Menu du site ».
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Switch } from 'radix-ui';
import { useId, useState } from 'react';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { sessionQuery } from '@/lib/session';
import { saveSiteSettings, siteSettingsQuery } from '@/lib/site-settings';
import { addPageToConfig, LIMITS, pageIdsInMenu, removePageFromConfig } from './model';

export function MenuSwitch({ pageDocumentId }: { pageDocumentId: string | null }) {
  const id = useId();
  const client = useQueryClient();
  const { data: session } = useQuery(sessionQuery);
  const siteId = session?.site?.documentId;
  const site = useQuery({ ...siteSettingsQuery(siteId ?? ''), enabled: !!siteId });
  const [pending, setPending] = useState(false);
  const inMenu = !!pageDocumentId && pageIdsInMenu(site.data?.navigation_config).has(pageDocumentId);

  const change = async (checked: boolean) => {
    if (!pageDocumentId || !siteId || !site.data) return;
    const next = checked ? addPageToConfig(site.data.navigation_config, pageDocumentId) : removePageFromConfig(site.data.navigation_config, pageDocumentId);
    if (!next) {
      toast.error(`Le menu est plein (${LIMITS.main} entrées). Placez la page dans un groupe depuis « Menu du site ».`);
      return;
    }
    setPending(true);
    try {
      await saveSiteSettings(client, siteId, { navigation_config: next });
      toast.success(checked ? 'Page ajoutée à la fin du menu. Elle y apparaîtra une fois publiée.' : 'Page retirée du menu.');
    } catch (error) {
      toast.error(`Le menu n'a pas pu être modifié : ${error instanceof ApiError ? error.message : 'erreur inattendue'}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="font-medium">
          Afficher dans le menu
        </label>
        <Switch.Root
          id={id}
          checked={inMenu}
          disabled={!pageDocumentId || !site.data || pending}
          onCheckedChange={(checked) => void change(checked)}
          aria-describedby={`${id}-aide`}
          className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-border-input transition-colors disabled:opacity-50 data-[state=checked]:bg-brand-button"
        >
          <Switch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[18px]" />
        </Switch.Root>
      </div>
      <p id={`${id}-aide`} className="mt-1 text-[13px] text-secondary">
        {pageDocumentId ? (
          <>
            Modifié tout de suite.{' '}
            <Link to="/mon-site/menu" className="text-brand underline underline-offset-2">
              Organiser le menu
            </Link>
          </>
        ) : (
          'Disponible après le premier enregistrement.'
        )}
      </p>
    </div>
  );
}
