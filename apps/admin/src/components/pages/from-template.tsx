/**
 * « Depuis un modèle » (liste des pages, #153) : créer une page de démarrage (salle des fêtes, état
 * civil…) en brouillon, puis l'ouvrir dans l'éditeur. Un modèle déjà utilisé mène à sa page.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Dialog } from 'radix-ui';
import { LayoutTemplate, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { dialogContentClass, useReturnFocus } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { createFromTemplates, pageTemplatesQuery } from '@/lib/page-templates';
import { cn } from '@/lib/utils';

export function FromTemplateButton() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const returnFocus = useReturnFocus();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const templates = useQuery({ ...pageTemplatesQuery, enabled: open });

  const create = async (id: string) => {
    setCreating(id);
    try {
      const { data } = await createFromTemplates(client, [id], { menu: false });
      setOpen(false);
      toast.success(`« ${data[0]!.title} » est créée en brouillon : adaptez-la puis publiez-la.`);
      await navigate({ to: '/pages/$documentId', params: { documentId: data[0]!.documentId } });
    } catch (error) {
      toast.error(
        `La page n'a pas été créée : ${error instanceof ApiError ? error.message : 'le serveur ne répond pas'}.`,
      );
    } finally {
      setCreating(null);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button type="button" variant="secondary" className="max-md:h-11">
          <LayoutTemplate aria-hidden="true" />
          Depuis un modèle
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content
          {...returnFocus}
          className={cn(dialogContentClass, 'max-h-[calc(100dvh-32px)] max-w-[600px] overflow-y-auto')}
        >
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="text-[17px] font-semibold">Créer une page depuis un modèle</Dialog.Title>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Fermer">
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-secondary">
            La page est créée en brouillon, avec des textes à adapter : les passages entre crochets sont à compléter.
          </Dialog.Description>
          {!templates.data ? (
            <div aria-busy="true" className="mt-4 h-48 animate-pulse rounded-lg bg-neutral-bg" />
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
              {templates.data.map((template) => (
                <li key={template.id} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="font-semibold">{template.title}</p>
                    <p className="text-[13px] text-secondary">{template.summary}</p>
                  </div>
                  {template.page ? (
                    <Link
                      to="/pages/$documentId"
                      params={{ documentId: template.page.documentId }}
                      className="text-[13px] font-medium text-brand underline"
                    >
                      Déjà créée : ouvrir<span className="sr-only"> « {template.page.title} »</span>
                    </Link>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="max-md:h-11"
                      disabled={creating !== null}
                      aria-label={`Créer la page « ${template.title} »`}
                      onClick={() => void create(template.id)}
                    >
                      {creating === template.id && <Loader2 aria-hidden="true" className="animate-spin" />}
                      Créer
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
