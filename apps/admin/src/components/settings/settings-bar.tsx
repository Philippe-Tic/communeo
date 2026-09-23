/**
 * Barre des écrans de réglages (handoff 6.10) : nom de l'écran, état d'enregistrement,
 * « Annuler les modifications » et « Enregistrer ». Les réglages ne sont pas enregistrés
 * automatiquement : un changement d'horaires ou de mentions légales se valide.
 * Sur mobile, les deux boutons sont fixés en bas de l'écran.
 */
import { Loader2 } from 'lucide-react';
import type { ReactNode, Ref } from 'react';
import { Button } from '@/components/ui/button';
import { formatListDate } from '@/lib/dates';

export function SettingsBar({
  title,
  headingRef,
  dirty,
  saving,
  savedAt,
  onCancel,
  onSave,
  saveType = 'button',
  form,
  children,
}: {
  title: string;
  headingRef?: Ref<HTMLHeadingElement>;
  dirty: boolean;
  saving: boolean;
  /** Date du dernier enregistrement (ISO) */
  savedAt: string;
  onCancel: () => void;
  /** Sans `onSave`, « Enregistrer » envoie le formulaire `form` */
  onSave?: () => void;
  saveType?: 'button' | 'submit';
  form?: string;
  /** Actions propres à l'écran (« Aperçu »…) */
  children?: ReactNode;
}) {
  return (
    <div className="sticky top-14 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-surface px-4 py-2.5 md:px-8 dark:bg-sidebar">
      <h1 ref={headingRef} className="flex-1 text-[15px] leading-tight font-semibold tracking-normal outline-none">
        {title}
      </h1>
      <p role="status" className="text-[13px] text-secondary">
        {dirty ? (
          <span className="font-medium text-warning">Modifications non enregistrées</span>
        ) : (
          `Dernier enregistrement : ${formatListDate(new Date(savedAt)).replace(/^./, (c) => c.toLowerCase())}`
        )}
      </p>
      {children}
      {/* Enregistrement : dans la barre sur ordinateur, fixé en bas de l'écran sur mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-border bg-surface p-3 md:static md:z-auto md:border-0 md:bg-transparent md:p-0 dark:bg-sidebar md:dark:bg-transparent">
        <Button
          type="button"
          variant="secondary"
          aria-label="Annuler les modifications"
          className="max-md:h-11 max-md:flex-1"
          disabled={!dirty || saving}
          onClick={onCancel}
        >
          <span>
            Annuler<span className="max-md:hidden"> les modifications</span>
          </span>
        </Button>
        <Button
          type={saveType}
          form={form}
          className="max-md:h-11 max-md:flex-1"
          disabled={!dirty || saving}
          onClick={onSave}
        >
          {saving && <Loader2 aria-hidden="true" className="animate-spin" />}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
