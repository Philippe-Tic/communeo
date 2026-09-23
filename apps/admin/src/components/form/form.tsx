/**
 * Formulaire du kit : react-hook-form + zod, un récapitulatif d'erreurs en tête qui prend le focus
 * à la soumission et renvoie vers chaque champ en erreur.
 */
import { CircleAlert } from 'lucide-react';
import { useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import { FormProvider, useFormState, type FieldErrors, type FieldValues, type SubmitHandler, type UseFormReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { fieldId, RequiredNote } from './field';

export interface ErrorEntry {
  name: string;
  message: string;
}

/** Erreurs à plat, dans l'ordre des champs à l'écran */
export function flattenErrors(errors: FieldErrors, prefix = ''): ErrorEntry[] {
  const entries: ErrorEntry[] = [];
  for (const [key, value] of Object.entries(errors)) {
    if (!value) continue;
    const name = prefix ? `${prefix}.${key}` : key;
    if (typeof value.message === 'string' && value.message) entries.push({ name, message: value.message });
    else if (typeof value === 'object') entries.push(...flattenErrors(value as FieldErrors, name));
  }
  const order = (name: string) => {
    const element = typeof document === 'undefined' ? null : document.querySelector(`[data-field="${CSS.escape(name)}"]`);
    return element ? Array.from(document.querySelectorAll('[data-field]')).indexOf(element) : Number.MAX_SAFE_INTEGER;
  };
  return entries.sort((a, b) => order(a.name) - order(b.name));
}

const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;

export function ErrorSummary({
  errors,
  title,
  focusKey,
  describe = (_name, message) => message,
}: {
  errors: ErrorEntry[];
  title: (count: number) => string;
  focusKey: number;
  /** Libellé d'une erreur dans le récapitulatif (ex. préfixé par le bloc concerné) */
  describe?: (name: string, message: string) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (errors.length && focusKey) ref.current?.focus();
    // Le focus ne revient au récapitulatif qu'à une nouvelle soumission
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);
  if (!errors.length) return null;

  const focusField = (name: string) => {
    // Champ, groupe ou liste : le premier contrôle qu'il contient (le bloc parent doit être ouvert)
    const target = document.getElementById(fieldId(name)) ?? document.querySelector<HTMLElement>(`[data-field="${CSS.escape(name)}"]`);
    const control = target && !target.matches('input, select, textarea, [contenteditable="true"]') ? (target.querySelector<HTMLElement>('input, select, textarea, [contenteditable="true"], button') ?? target) : target;
    control?.focus();
    control?.scrollIntoView({ block: 'center' });
  };

  return (
    <div ref={ref} tabIndex={-1} role="alert" className="mb-6 flex gap-3 rounded-[10px] border border-danger bg-danger-alert-bg p-4 text-text">
      <CircleAlert aria-hidden="true" className="size-5 shrink-0 text-danger" />
      <div>
        <p className="font-semibold">{title(errors.length)}</p>
        <ul className="mt-1.5 space-y-1">
          {errors.map((error) => (
            <li key={error.name}>
              <a
                href={`#${fieldId(error.name)}`}
                className="text-text underline underline-offset-2 hover:text-brand"
                onClick={(event) => {
                  event.preventDefault();
                  focusField(error.name);
                }}
              >
                {describe(error.name, error.message)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Form<T extends FieldValues>({
  form,
  onSubmit,
  summaryTitle = (count) => `${plural(count, 'erreur empêche', 'erreurs empêchent')} l'enregistrement`,
  className,
  children,
  id,
  requiredNote = true,
  describeError,
}: {
  form: UseFormReturn<T>;
  onSubmit: SubmitHandler<T>;
  summaryTitle?: (count: number) => string;
  className?: string;
  children: ReactNode;
  id?: string;
  /** Phrase expliquant l'astérisque (à omettre s'il n'y a aucun champ obligatoire) */
  requiredNote?: boolean;
  describeError?: (name: string, message: string) => string;
}) {
  const errors = flattenErrors(form.formState.errors);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    // Les erreurs sont annoncées par le récapitulatif : pas de focus automatique sur le premier champ
    void form.handleSubmit(onSubmit)(event);
  };
  return (
    <FormProvider {...form}>
      <form id={id} noValidate onSubmit={submit} className={className}>
        <ErrorSummary errors={errors} title={summaryTitle} focusKey={form.formState.submitCount} describe={describeError} />
        {requiredNote && <RequiredNote />}
        {children}
      </form>
    </FormProvider>
  );
}

export { plural };

/**
 * Section de formulaire en carte : titre 16/600 et nombre d'erreurs de ses champs (« ● 1 erreur »),
 * repris dans le titre pour la navigation par titres des lecteurs d'écran.
 */
export function FormSection({ title, fields, id, children, className }: { title: string; fields: string[]; id?: string; children: ReactNode; className?: string }) {
  const { errors } = useFormState();
  const count = flattenErrors(errors).filter((error) => fields.some((field) => error.name === field || error.name.startsWith(`${field}.`))).length;
  const headingId = id ?? `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <section aria-labelledby={headingId} className={cn('space-y-5 rounded-xl border border-border bg-surface p-6', className)} data-section={headingId}>
      <h2 id={headingId} className="flex flex-wrap items-center gap-2.5 text-base font-semibold">
        {title}
        {count > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-normal text-danger">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
            {count} erreur{count > 1 ? 's' : ''}
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}
