/**
 * Formulaires des blocs (handoff 6.3, blocs ouverts). Chaque formulaire reçoit le chemin du bloc
 * dans le formulaire du contenu (`blocks.3`) : mêmes champs, mêmes erreurs que partout ailleurs.
 */
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { BLOCK_LIMITS } from '@communeo/core';
import { RadioGroupField, SwitchField, TextareaField, TextField } from '@/components/form';
import { FieldError, fieldId } from '@/components/form/field';
import { Button } from '@/components/ui/button';
import { emptyDoc, type Block } from './catalog';
import { RichTextField } from './rich-text';

export interface BlockFormProps {
  /** Chemin du bloc dans le formulaire, ex. `blocks.3` */
  path: string;
}

export function TextBlockForm({ path }: BlockFormProps) {
  return <RichTextField name={`${path}.body`} label="Texte" required hideLabel />;
}

export function CalloutBlockForm({ path }: BlockFormProps) {
  return (
    <div className="space-y-5">
      <RadioGroupField
        name={`${path}.variant`}
        label="Type d'encadré"
        required
        options={[
          { value: 'info', label: 'Information' },
          { value: 'warning', label: 'Attention' },
          { value: 'important', label: 'Important' },
          { value: 'tip', label: 'Conseil' },
        ]}
      />
      <TextField name={`${path}.title`} label="Titre" />
      <RichTextField name={`${path}.body`} label="Texte de l'encadré" headings={false} required />
    </div>
  );
}

/** Erreur portée par une liste (nombre minimum ou maximum d'éléments) */
function ListError({ name }: { name: string }) {
  const { getFieldState, formState } = useFormContext();
  const error = getFieldState(name, formState).error;
  const message = error?.message ?? (error as { root?: { message?: string } } | undefined)?.root?.message;
  return <FieldError id={fieldId(name)} message={message} />;
}

export function ButtonsBlockForm({ path }: BlockFormProps) {
  const { fields, append, remove } = useFieldArray({ name: `${path}.buttons` });
  const { max } = BLOCK_LIMITS.buttons;
  return (
    <div className="space-y-4" id={fieldId(`${path}.buttons`)} tabIndex={-1}>
      {fields.map((field, index) => (
        <fieldset key={field.id} className="space-y-4 rounded-lg border border-border p-4">
          <legend className="px-1 text-[13px] font-semibold text-secondary">
            Bouton {index + 1} sur {fields.length}
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name={`${path}.buttons.${index}.label`} label="Libellé" required />
            <TextField name={`${path}.buttons.${index}.url`} label="Lien" required help="Adresse d'une page du site (/demarches) ou d'un autre site (https://…)." />
          </div>
          <RadioGroupField
            name={`${path}.buttons.${index}.style`}
            label="Apparence"
            options={[
              { value: 'primary', label: 'Principal' },
              { value: 'secondary', label: 'Secondaire' },
            ]}
          />
          {fields.length > 1 && (
            <Button type="button" variant="tertiary" size="sm" className="text-danger" onClick={() => remove(index)}>
              <Trash2 aria-hidden="true" />
              Retirer le bouton {index + 1}
            </Button>
          )}
        </fieldset>
      ))}
      <ListError name={`${path}.buttons`} />
      {fields.length < max && (
        <Button type="button" variant="secondary" size="sm" onClick={() => append({ label: '', url: '', style: 'secondary' })}>
          <Plus aria-hidden="true" />
          Ajouter un bouton
        </Button>
      )}
    </div>
  );
}

export function FaqBlockForm({ path }: BlockFormProps) {
  const { fields, append, remove, move } = useFieldArray({ name: `${path}.items` });
  return (
    <div className="space-y-4">
      <TextField name={`${path}.title`} label="Titre de la section" />
      <div className="space-y-3" id={fieldId(`${path}.items`)} tabIndex={-1}>
        {fields.map((field, index) => (
          <fieldset key={field.id} className="space-y-4 rounded-lg border border-border p-4">
            <legend className="sr-only">
              Question {index + 1} sur {fields.length}
            </legend>
            <div className="flex items-center gap-1">
              <span aria-hidden="true" className="text-[13px] font-semibold text-secondary">
                Question {index + 1} sur {fields.length}
              </span>
              <div className="ml-auto flex gap-1">
                <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Monter la question ${index + 1}`} disabled={index === 0} onClick={() => move(index, index - 1)}>
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Descendre la question ${index + 1}`} disabled={index === fields.length - 1} onClick={() => move(index, index + 1)}>
                  <ArrowDown aria-hidden="true" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="size-8 text-danger" aria-label={`Supprimer la question ${index + 1}`} disabled={fields.length === 1} onClick={() => remove(index)}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </div>
            <TextField name={`${path}.items.${index}.question`} label="Question" required />
            <RichTextField name={`${path}.items.${index}.answer`} label="Réponse" headings={false} required />
          </fieldset>
        ))}
        <ListError name={`${path}.items`} />
      </div>
      {fields.length < BLOCK_LIMITS.faq.max && (
        <Button type="button" variant="secondary" size="sm" onClick={() => append({ question: '', answer: emptyDoc() })}>
          <Plus aria-hidden="true" />
          Ajouter une question
        </Button>
      )}
    </div>
  );
}

export function ContactBlockForm({ path }: BlockFormProps) {
  return (
    <div className="space-y-5">
      <TextField name={`${path}.name`} label="Nom du service ou du lieu" required />
      <TextareaField name={`${path}.address`} label="Adresse" rows={2} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name={`${path}.phone`} label="Téléphone" inputProps={{ type: 'tel', autoComplete: 'off' }} />
        <TextField name={`${path}.email`} label="E-mail" inputProps={{ type: 'email', autoComplete: 'off' }} />
      </div>
      <TextareaField name={`${path}.hours`} label="Horaires" rows={3} help="Les horaires d'ouverture de la mairie sont déjà dans les informations de la commune." />
      <SwitchField name={`${path}.show_map`} label="Afficher une carte" help="Carte centrée sur l'adresse, chargée après consentement du visiteur." />
    </div>
  );
}

const PROVIDERS: Array<[RegExp, string]> = [
  [/youtube\.com|youtu\.be|youtube-nocookie\.com/i, 'YouTube'],
  [/dailymotion\.com|dai\.ly/i, 'Dailymotion'],
  [/vimeo\.com/i, 'Vimeo'],
];

export function VideoBlockForm({ path }: BlockFormProps) {
  const url = useWatch({ name: `${path}.url` }) as string | undefined;
  const provider = url ? PROVIDERS.find(([pattern]) => pattern.test(url))?.[1] : undefined;
  return (
    <div className="space-y-5">
      <TextField
        name={`${path}.url`}
        label="Lien de la vidéo"
        required
        inputProps={{ type: 'url', inputMode: 'url' }}
        help={provider ? `${provider} reconnu. YouTube, Dailymotion et Vimeo sont acceptés.` : 'YouTube, Dailymotion et Vimeo sont acceptés.'}
      />
      <TextField name={`${path}.title`} label="Titre de la vidéo" required help="Lu par les lecteurs d'écran." />
      <TextareaField
        name={`${path}.transcript`}
        label="Transcription"
        rows={4}
        help="Recommandée : le texte de la vidéo pour les personnes qui ne peuvent pas l'écouter (conformité RGAA). La vidéo ne se charge qu'après le consentement du visiteur."
      />
    </div>
  );
}

/** Blocs qui dépendent de la médiathèque (#142) : visibles, déplaçables, pas encore modifiables */
export function MediaBlockPending({ block }: { block: Block }) {
  return (
    <p className="rounded-lg border border-dashed border-border-input bg-sidebar p-4 text-secondary">
      Ce bloc se modifiera depuis la médiathèque, bientôt disponible. Vous pouvez déjà le déplacer, le dupliquer ou le supprimer.
      {block.__component === 'blocks.image' && ' Le texte alternatif de l’image y sera obligatoire.'}
    </p>
  );
}

export function BlockForm({ block, path }: { block: Block; path: string }) {
  switch (block.__component) {
    case 'blocks.text':
      return <TextBlockForm path={path} />;
    case 'blocks.callout':
      return <CalloutBlockForm path={path} />;
    case 'blocks.buttons':
      return <ButtonsBlockForm path={path} />;
    case 'blocks.faq':
      return <FaqBlockForm path={path} />;
    case 'blocks.contact':
      return <ContactBlockForm path={path} />;
    case 'blocks.video':
      return <VideoBlockForm path={path} />;
    default:
      return <MediaBlockPending block={block} />;
  }
}
