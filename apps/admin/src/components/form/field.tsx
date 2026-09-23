/**
 * Champ de formulaire accessible : libellé relié, mention obligatoire / facultatif, aide et erreur
 * reliées au contrôle par aria-describedby, aria-invalid en erreur. Tous les champs de l'admin passent
 * par ce composant (ou par FieldSet pour les groupes : radios, heure).
 */
import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const fieldId = (name: string) => `champ-${name.replace(/[^\w-]/g, '-')}`;

export interface FieldProps {
  name: string;
  label: ReactNode;
  required?: boolean;
  help?: ReactNode;
  error?: string;
  /** Badge à côté du libellé (ex. « Requis pour la conformité ») */
  badge?: ReactNode;
  /** Ne pas afficher « (facultatif) » : champ rempli automatiquement (adresse générée depuis le titre…) */
  hideOptional?: boolean;
  className?: string;
}

/** Attributs à poser sur le contrôle (input, select, textarea, bouton de l'interrupteur…) */
export interface ControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  'aria-required'?: true;
}

export function controlProps({ name, help, error, required }: Pick<FieldProps, 'name' | 'help' | 'error' | 'required'>): ControlProps {
  const id = fieldId(name);
  const describedBy = [help && `${id}-aide`, error && `${id}-erreur`].filter(Boolean).join(' ');
  return {
    id,
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    ...(error ? { 'aria-invalid': true as const } : {}),
    ...(required ? { 'aria-required': true as const } : {}),
  };
}

/**
 * Obligatoire : astérisque visible (expliqué en tête de formulaire, voir RequiredNote) et aria-required
 * sur le contrôle (RGAA 11.10). Facultatif : mention « (facultatif) » dans le libellé.
 */
export function RequirementMark({ required, hideOptional }: { required?: boolean; hideOptional?: boolean }) {
  if (!required && hideOptional) return null;
  return required ? (
    <span aria-hidden="true" className="ml-0.5 text-danger">
      *
    </span>
  ) : (
    <>
      {' '}
      <span className="font-normal text-secondary">(facultatif)</span>
    </>
  );
}

export function FieldHelp({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={`${id}-aide`} className="mt-1.5 text-[13px] text-secondary">
      {children}
    </p>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`${id}-erreur`} className="mt-1.5 flex items-start gap-1.5 text-[13px] text-danger">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/** Champ simple : le contrôle est rendu par `children` avec les attributs de controlProps */
export function Field({ name, label, required, help, error, badge, hideOptional, className, children }: FieldProps & { children: (props: ControlProps) => ReactNode }) {
  const id = fieldId(name);
  return (
    <div className={className} data-field={name}>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="font-medium">
          {label}
          <RequirementMark required={required} hideOptional={hideOptional} />
        </label>
        {badge}
      </div>
      <div className="mt-1.5">{children(controlProps({ name, help, error, required }))}</div>
      {help && <FieldHelp id={id}>{help}</FieldHelp>}
      <FieldError id={id} message={error} />
    </div>
  );
}

/** Groupe de contrôles (radios, date et heure…) : fieldset et légende */
export function FieldSet({ name, legend, required, help, error, className, children }: Omit<FieldProps, 'label'> & { legend: ReactNode; children: ReactNode }) {
  const id = fieldId(name);
  const describedBy = [help && `${id}-aide`, error && `${id}-erreur`].filter(Boolean).join(' ') || undefined;
  return (
    <fieldset id={id} className={className} aria-describedby={describedBy} aria-invalid={error ? true : undefined} data-field={name} tabIndex={-1}>
      <legend className="font-medium">
        {legend}
        <RequirementMark required={required} />
      </legend>
      <div className="mt-2">{children}</div>
      {help && <FieldHelp id={id}>{help}</FieldHelp>}
      <FieldError id={id} message={error} />
    </fieldset>
  );
}

export function RequiredNote() {
  return (
    <p className="mb-4 text-[13px] text-secondary">
      Les champs marqués d'un astérisque (<span className="text-danger">*</span>) sont obligatoires.
    </p>
  );
}

/** Boîte commune des champs : 14 px, rayon 8, bordure border-input ; 2 px rouge en erreur */
export const controlClass = cn(
  'block w-full rounded-lg border border-border-input bg-surface px-3 text-base text-text md:text-sm dark:bg-sidebar',
  'placeholder:text-secondary aria-invalid:border-2 aria-invalid:border-danger',
  'disabled:border-border disabled:bg-sidebar disabled:text-secondary',
);
