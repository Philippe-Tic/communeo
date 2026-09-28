/**
 * Fenêtre de saisie d'une action de l'équipe sur une facture (payée, déposée sur Chorus Pro) : quelques
 * champs du kit (libellé, obligatoire, erreur reliée), validés à l'envoi ; le premier champ en erreur
 * reprend le focus. Même structure que la fenêtre de refus avec motif.
 */
import { AlertDialog } from 'radix-ui';
import { CircleAlert, Loader2, type LucideIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { controlClass, Field, fieldId, RequiredNote } from '@/components/form/field';
import { Button } from '@/components/ui/button';
import { DialogIcon, dialogContentClass, useReturnFocus } from '@/components/ui/confirm-dialog';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface FormDialogField {
  name: string;
  label: string;
  type: 'date' | 'number' | 'text';
  required?: boolean;
  help?: string;
  /** Message d'erreur, ou null si la valeur convient */
  validate?: (value: string) => string | null;
  inputProps?: { min?: string; max?: string; step?: string; maxLength?: number; inputMode?: 'decimal' };
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  icon,
  title,
  description,
  fields,
  initialValues,
  confirmLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: LucideIcon;
  title: string;
  description: string;
  fields: FormDialogField[];
  initialValues: Record<string, string>;
  confirmLabel: string;
  onSubmit: (values: Record<string, string>) => Promise<void>;
}) {
  const returnFocus = useReturnFocus();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  const form = useRef<HTMLDivElement>(null);
  // Nouvelle ouverture : valeurs par défaut de la facture concernée
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValues(initialValues);
      setErrors({});
      setFailure(null);
    }
  }

  const submit = async () => {
    const found: Record<string, string> = {};
    for (const field of fields) {
      const value = (values[field.name] ?? '').trim();
      const problem = field.required && !value ? `Indiquez ${field.label.toLowerCase()}.` : value && field.validate ? field.validate(value) : null;
      if (problem) found[field.name] = problem;
    }
    setErrors(found);
    const first = fields.find((field) => found[field.name]);
    if (first) {
      form.current?.querySelector<HTMLElement>(`#${fieldId(first.name)}`)?.focus();
      return;
    }
    setPending(true);
    setFailure(null);
    try {
      await onSubmit(Object.fromEntries(fields.map((field) => [field.name, (values[field.name] ?? '').trim()])));
      onOpenChange(false);
    } catch (caught) {
      setFailure(caught instanceof ApiError ? caught.message : "L'action n'a pas pu être enregistrée.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={(value) => !pending && onOpenChange(value)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <AlertDialog.Content className={cn(dialogContentClass, 'max-w-[540px]')} {...returnFocus}>
          <div className="flex gap-3">
            <DialogIcon tone="info" icon={icon} />
            <div>
              <AlertDialog.Title className="text-[17px] font-semibold">{title}</AlertDialog.Title>
              <AlertDialog.Description className="mt-1.5 text-secondary">{description}</AlertDialog.Description>
            </div>
          </div>

          <div ref={form} className="mt-5 space-y-4">
            {fields.some((field) => field.required) && <RequiredNote />}
            {fields.map((field) => (
              <Field key={field.name} name={field.name} label={field.label} required={field.required} help={field.help} error={errors[field.name]}>
                {(props) => (
                  <input
                    {...props}
                    type={field.type}
                    value={values[field.name] ?? ''}
                    onChange={(event) => {
                      setValues({ ...values, [field.name]: event.target.value });
                      if (errors[field.name]) setErrors({ ...errors, [field.name]: '' });
                    }}
                    {...field.inputProps}
                    className={cn(controlClass, 'h-11 md:h-10')}
                  />
                )}
              </Field>
            ))}
          </div>

          {failure && (
            <p role="alert" className="mt-4 flex gap-2 text-[13px] text-danger">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              {failure}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" disabled={pending}>
                Annuler
              </Button>
            </AlertDialog.Cancel>
            <Button variant="primary" disabled={pending} onClick={() => void submit()}>
              {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
