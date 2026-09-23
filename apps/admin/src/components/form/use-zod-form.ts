import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type DefaultValues, type FieldValues, type Resolver } from 'react-hook-form';
import type { z } from 'zod';

/**
 * Formulaire validé par un schéma zod (idéalement partagé depuis @communeo/core). Validation à la
 * soumission, puis à la saisie ; le focus va au récapitulatif d'erreurs, pas au premier champ.
 */
export function useZodForm<Input extends FieldValues, Output extends FieldValues>(schema: z.ZodType<Output, Input>, defaultValues: DefaultValues<Input>) {
  return useForm<Input, unknown, Output>({
    resolver: zodResolver(schema as never) as unknown as Resolver<Input, unknown, Output>,
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: false,
  });
}
