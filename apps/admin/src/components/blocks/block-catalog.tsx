/**
 * Catalogue des blocs (variante 1e) : panneau latéral, un clic insère le bloc à la position surlignée
 * dans la liste et referme le panneau. Échap ferme, le focus revient au bouton « Ajouter un bloc ».
 */
import { Dialog } from 'radix-ui';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BLOCK_TYPES, type Block } from './catalog';

export function BlockCatalog({ open, position, onSelect, onClose }: { open: boolean; position: string; onSelect: (block: Block) => void; onClose: () => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={(value) => !value && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay xl:bg-transparent" />
        <Dialog.Content
          onCloseAutoFocus={(event) => event.preventDefault()}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[520px] flex-col border-l border-border bg-surface text-text shadow-dialog dark:border-border-dialog dark:bg-sidebar"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
            <div>
              <Dialog.Title className="text-[17px] font-semibold">Ajouter un bloc</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[13px] text-secondary">Le bloc sera inséré en {position}.</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fermer le catalogue">
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <ul className="grid flex-1 content-start gap-2 overflow-y-auto p-6 sm:grid-cols-2">
            {BLOCK_TYPES.map((type) => {
              const Icon = type.icon;
              const descriptionId = `catalogue-${type.uid}`;
              return (
                <li key={type.uid}>
                  <button
                    type="button"
                    aria-disabled={!type.available || undefined}
                    aria-labelledby={`${descriptionId}-nom`}
                    aria-describedby={descriptionId}
                    onClick={() => type.available && onSelect(type.create())}
                    className="flex h-full w-full items-start gap-3 rounded-[10px] border border-border p-3 text-left hover:border-brand hover:bg-surface-hover aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:hover:border-border aria-disabled:hover:bg-transparent"
                  >
                    <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-md bg-brand-soft text-brand">
                      <Icon className="size-4" />
                    </span>
                    <span>
                      <span id={`${descriptionId}-nom`} className="block font-semibold">
                        {type.label}
                      </span>
                      <span id={descriptionId} className="mt-0.5 block text-[13px] text-secondary">
                        {type.available ? type.description : `${type.description} Arrive avec la médiathèque.`}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
