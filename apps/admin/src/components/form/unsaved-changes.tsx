/**
 * Garde « modifications non enregistrées » : bloque la navigation dans l'admin (fenêtre du kit)
 * et la fermeture de l'onglet (fenêtre du navigateur) tant que le formulaire est modifié.
 */
import { useBlocker } from '@tanstack/react-router';
import { UnsavedChangesDialog } from '@/components/ui/confirm-dialog';

export function UnsavedChangesGuard({ when, onSave }: { when: boolean; onSave?: () => Promise<boolean> }) {
  const blocker = useBlocker({ shouldBlockFn: () => when, enableBeforeUnload: () => when, withResolver: true });
  if (blocker.status !== 'blocked') return null;
  return (
    <UnsavedChangesDialog
      open
      onStay={() => blocker.reset()}
      onLeave={() => blocker.proceed()}
      onSaveAndLeave={
        onSave
          ? async () => {
              if (await onSave()) blocker.proceed();
              else blocker.reset();
            }
          : undefined
      }
    />
  );
}
