/**
 * Contrôles du kit, reliés au formulaire (react-hook-form) par leur nom.
 * Chaque contrôle est un vrai élément natif ou un rôle ARIA complet (interrupteur).
 */
import { CalendarDays, ChevronDown } from 'lucide-react';
import { Switch as SwitchPrimitive } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { Controller, useFormContext, type FieldValues, type Path } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { controlClass, controlProps, Field, FieldSet, fieldId, RequirementMark, FieldHelp, FieldError, type FieldProps } from './field';

type Base<T extends FieldValues> = Omit<FieldProps, 'name' | 'error'> & { name: Path<T> };

export function useFieldError(name: string): string | undefined {
  const { formState, getFieldState } = useFormContext();
  return getFieldState(name, formState).error?.message;
}

export function TextField<T extends FieldValues>({
  name,
  prefix,
  inputProps,
  ...field
}: Base<T> & { prefix?: string; inputProps?: Omit<ComponentProps<'input'>, 'name' | 'id'> }) {
  const { register } = useFormContext<T>();
  const error = useFieldError(name);
  return (
    <Field name={name} error={error} {...field}>
      {(props) =>
        prefix ? (
          <div className="flex rounded-lg">
            <span aria-hidden="true" title={prefix} className="flex max-w-[55%] shrink-0 items-center truncate rounded-l-lg border border-r-0 border-border-input bg-sidebar px-3 text-[13px] whitespace-nowrap text-secondary">
              {prefix}
            </span>
            <input {...props} {...register(name)} {...inputProps} className={cn(controlClass, 'h-11 min-w-0 rounded-l-none md:h-10', inputProps?.className)} />
          </div>
        ) : (
          <input {...props} {...register(name)} {...inputProps} className={cn(controlClass, 'h-11 md:h-10', inputProps?.className)} />
        )
      }
    </Field>
  );
}

export function TextareaField<T extends FieldValues>({ name, rows = 4, ...field }: Base<T> & { rows?: number }) {
  const { register } = useFormContext<T>();
  const error = useFieldError(name);
  return (
    <Field name={name} error={error} {...field}>
      {(props) => <textarea {...props} {...register(name)} rows={rows} className={cn(controlClass, 'resize-y px-3 py-2.5')} />}
    </Field>
  );
}

export interface Option {
  value: string;
  label: string;
}

export function SelectField<T extends FieldValues>({ name, options, placeholder, ...field }: Base<T> & { options: Option[]; placeholder?: string }) {
  const { register } = useFormContext<T>();
  const error = useFieldError(name);
  return (
    <Field name={name} error={error} {...field}>
      {(props) => (
        <div className="relative">
          <select {...props} {...register(name)} className={cn(controlClass, 'h-11 appearance-none pr-9 md:h-10')}>
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-secondary" />
        </div>
      )}
    </Field>
  );
}

export function DateField<T extends FieldValues>({ name, ...field }: Base<T>) {
  const { register } = useFormContext<T>();
  const error = useFieldError(name);
  return (
    <Field name={name} error={error} {...field}>
      {(props) => (
        <div className="relative">
          {/* Le bouton calendrier natif, invisible, recevait le focus clavier sans rien montrer : il est
              retiré, un clic dans le champ ouvre le calendrier ; au clavier, la date se saisit */}
          <input
            type="date"
            {...props}
            {...register(name)}
            onClick={(event) => {
              try {
                event.currentTarget.showPicker();
              } catch {
                // Navigateur sans showPicker ou champ désactivé : saisie au clavier
              }
            }}
            className={cn(controlClass, 'h-11 pr-9 md:h-10 [&::-webkit-calendar-picker-indicator]:hidden')}
          />
          <CalendarDays aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-secondary" />
        </div>
      )}
    </Field>
  );
}

const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

/**
 * Heure en deux listes « h » / « min » au pas de 15 minutes (pas de saisie libre). Valeur « HH:MM ».
 */
export function TimeField<T extends FieldValues>({ name, label, ...field }: Base<T>) {
  const { control } = useFormContext<T>();
  const error = useFieldError(name);
  const id = fieldId(name);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur, ref } }) => {
        const [hour = '', minute = ''] = typeof value === 'string' && value ? value.split(':') : [];
        const set = (h: string, m: string) => onChange(h || m ? `${h || '00'}:${m || '00'}` : '');
        const describedBy = [field.help && `${id}-aide`, error && `${id}-erreur`].filter(Boolean).join(' ') || undefined;
        const select = cn(controlClass, 'h-11 w-24 appearance-none pr-8 md:h-10');
        return (
          <FieldSet name={name} legend={label} error={error} {...field}>
            <div className="flex items-center gap-2">
              <div className="relative">
                <label htmlFor={`${id}-h`} className="sr-only">
                  Heures
                </label>
                <select ref={ref} id={`${id}-h`} value={hour} onBlur={onBlur} onChange={(e) => set(e.target.value, minute)} className={select} aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
                  <option value="">--</option>
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-secondary" />
              </div>
              <span aria-hidden="true">h</span>
              <div className="relative">
                <label htmlFor={`${id}-min`} className="sr-only">
                  Minutes
                </label>
                <select id={`${id}-min`} value={minute} onBlur={onBlur} onChange={(e) => set(hour, e.target.value)} className={select} aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
                  <option value="">--</option>
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-secondary" />
              </div>
              <span aria-hidden="true">min</span>
            </div>
          </FieldSet>
        );
      }}
    />
  );
}

export function CheckboxField<T extends FieldValues>({ name, label, help, required }: Base<T>) {
  const { register } = useFormContext<T>();
  const error = useFieldError(name);
  const props = controlProps({ name, help, error, required });
  return (
    <div data-field={name}>
      <div className="flex items-start gap-2.5">
        <input type="checkbox" {...props} {...register(name)} className="mt-0.5 size-[18px] shrink-0 rounded accent-[var(--brand-button)]" />
        <label htmlFor={props.id} className="font-medium">
          {label}
          {required && <RequirementMark required />}
        </label>
      </div>
      {help && <FieldHelp id={props.id}>{help}</FieldHelp>}
      <FieldError id={props.id} message={error} />
    </div>
  );
}

/** Interrupteur 36 × 20 (role="switch") ; le libellé est à gauche, l'état est annoncé */
export function SwitchField<T extends FieldValues>({ name, label, help }: Base<T>) {
  const { control } = useFormContext<T>();
  const error = useFieldError(name);
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur, ref } }) => {
        const props = controlProps({ name, help, error });
        return (
          <div data-field={name}>
            <div className="flex items-center justify-between gap-4">
              <label htmlFor={props.id} className="font-medium">
                {label}
              </label>
              <SwitchPrimitive.Root
                {...props}
                ref={ref}
                checked={!!value}
                onCheckedChange={onChange}
                onBlur={onBlur}
                className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-border-input transition-colors data-[state=checked]:bg-brand-button"
              >
                <SwitchPrimitive.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[18px]" />
              </SwitchPrimitive.Root>
            </div>
            {help && <FieldHelp id={props.id}>{help}</FieldHelp>}
            <FieldError id={props.id} message={error} />
          </div>
        );
      }}
    />
  );
}

/** Radios (fieldset / legend) ; `cards` : radios « carte » avec description (rôle, niveau de conformité) */
export function RadioGroupField<T extends FieldValues>({
  name,
  label,
  options,
  cards,
  ...field
}: Base<T> & { options: Array<Option & { description?: ReactNode }>; cards?: boolean }) {
  const { register } = useFormContext<T>();
  const error = useFieldError(name);
  const id = fieldId(name);
  return (
    <FieldSet name={name} legend={label} error={error} {...field}>
      <div className={cn(cards ? 'grid gap-2' : 'flex flex-wrap gap-x-6 gap-y-2')}>
        {options.map((option) => {
          const optionId = `${id}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cn(
                'flex cursor-pointer items-start gap-2.5',
                cards && 'rounded-lg border border-border-input px-3 py-2.5 has-checked:border-2 has-checked:border-brand has-checked:bg-selected-row',
              )}
            >
              <input
                type="radio"
                id={optionId}
                value={option.value}
                {...register(name)}
                aria-describedby={option.description ? `${optionId}-desc` : undefined}
                className="mt-0.5 size-[18px] shrink-0 accent-[var(--brand-button)]"
              />
              <span>
                <span className={cn(cards && 'font-semibold')}>{option.label}</span>
                {option.description && (
                  <span id={`${optionId}-desc`} className="mt-0.5 block text-[13px] text-secondary">
                    {option.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </FieldSet>
  );
}
