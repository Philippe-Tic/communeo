/**
 * Mot de passe : bouton « Afficher » (aria-pressed), et indicateur de robustesse (3 barres, annoncé)
 * pour le choix d'un nouveau mot de passe. 10 caractères minimum (règle du backend).
 */
import { Eye, EyeOff } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useFormContext, useWatch, type FieldValues, type Path } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { controlClass, Field, type FieldProps } from './field';

export const MIN_PASSWORD_LENGTH = 10;

export type Strength = { level: 0 | 1 | 2 | 3; label: string };

export function passwordStrength(value: string): Strength {
  if (!value) return { level: 0, label: '' };
  if (value.length < MIN_PASSWORD_LENGTH) {
    return { level: 1, label: `Trop court : ${value.length} caractère${value.length > 1 ? 's' : ''} sur ${MIN_PASSWORD_LENGTH} minimum. Ajoutez des mots.` };
  }
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^\w\s]|_/, /\s|-/].filter((pattern) => pattern.test(value)).length;
  const robust = value.length >= 14 || (value.length >= 12 && variety >= 3);
  return robust ? { level: 3, label: `Robuste · ${value.length} caractères` } : { level: 2, label: `Correct · ${value.length} caractères. Un mot de plus le rendra robuste.` };
}

export function PasswordField<T extends FieldValues>({
  name,
  autoComplete,
  strength,
  labelAction,
  ...field
}: Omit<FieldProps, 'name' | 'error'> & { name: Path<T>; autoComplete: 'current-password' | 'new-password'; strength?: boolean; labelAction?: ReactNode }) {
  const { register, getFieldState, formState } = useFormContext<T>();
  const [visible, setVisible] = useState(false);
  const value = (useWatch({ name }) as string | undefined) ?? '';
  const error = getFieldState(name, formState).error?.message;
  const meter = strength ? passwordStrength(value) : null;

  return (
    <div className="relative">
      {labelAction && <div className="absolute top-0 right-0 text-[13px]">{labelAction}</div>}
      <Field name={name} error={error} {...field}>
        {(props) => (
          <>
            <div className="relative">
              <input
                {...props}
                {...register(name)}
                type={visible ? 'text' : 'password'}
                autoComplete={autoComplete}
                aria-describedby={[props['aria-describedby'], meter?.level ? `${props.id}-robustesse` : null].filter(Boolean).join(' ') || undefined}
                className={cn(controlClass, 'h-11 pr-11 md:h-10')}
              />
              <button
                type="button"
                aria-label="Afficher le mot de passe"
                aria-pressed={visible}
                onClick={() => setVisible((shown) => !shown)}
                className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-md text-secondary hover:bg-surface-hover"
              >
                {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
              </button>
            </div>
            {meter && meter.level > 0 && (
              <div className="mt-2">
                <div aria-hidden="true" className="grid grid-cols-3 gap-1">
                  {[1, 2, 3].map((bar) => (
                    <span
                      key={bar}
                      className={cn('h-1 rounded-full', bar <= meter.level ? (meter.level === 1 ? 'bg-danger' : meter.level === 2 ? 'bg-warning' : 'bg-success') : 'bg-border')}
                    />
                  ))}
                </div>
                <p id={`${props.id}-robustesse`} aria-live="polite" className={cn('mt-1.5 text-[13px] font-medium', meter.level === 1 ? 'text-danger' : meter.level === 2 ? 'text-warning' : 'text-success')}>
                  {meter.label}
                </p>
              </div>
            )}
          </>
        )}
      </Field>
    </div>
  );
}
