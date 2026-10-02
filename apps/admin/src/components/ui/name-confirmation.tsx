/**
 * Confirmation forte d'une suppression (#391) : taper le nom de ce qui sera supprimé. Le bouton de la
 * fenêtre reste désactivé tant que le nom ne correspond pas (`deletionConfirmed` de @communeo/core,
 * casse et espaces ignorés, comme côté serveur).
 */
import { useId } from 'react';
import { controlClass } from '@/components/form/field';
import { cn } from '@/lib/utils';

export function NameConfirmation({ name, value, onChange }: { name: string; value: string; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        Pour confirmer, tapez le nom de la commune : <span className="font-normal">« {name} »</span>
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        className={cn(controlClass, 'mt-1.5 h-10 w-full')}
      />
    </div>
  );
}
