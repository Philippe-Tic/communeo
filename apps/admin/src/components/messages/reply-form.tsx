/**
 * Réponse à un message (handoff 6.14) : texte, pièce jointe facultative (rangée dans la médiathèque
 * de la commune), « Marquer comme traité » coché par défaut, « Envoyer ». La réponse part par e-mail
 * à l'habitant et reste dans l'historique ; en cas d'échec d'envoi, rien n'est enregistré et le texte
 * reste dans le champ. Sur mobile, le même formulaire s'ouvre en plein écran.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from 'radix-ui';
import { Loader2, Paperclip, Send, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { RGPD_TEMPLATE_BLANK } from '@communeo/core';
import { Button } from '@/components/ui/button';
import { useReturnFocus } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  checkFile,
  describeFile,
  DOCUMENT_TYPES,
  IMAGE_TYPES,
  trackUpload,
  uploadFile,
  type UploadedFile,
} from '@/lib/media';
import { refreshMessages, sendReply, senderName, type Message } from '@/lib/messages';
import { cn } from '@/lib/utils';

export interface ReplyDraft {
  text: string;
  resolve: boolean;
  attachment: UploadedFile | null;
}

export const EMPTY_DRAFT: ReplyDraft = { text: '', resolve: true, attachment: null };
export const REPLY_FIELD_ID = 'reponse-message';
const MAX_LENGTH = 20_000;
const TYPES = [...DOCUMENT_TYPES, ...IMAGE_TYPES];

const errorText = (error: unknown) => (error instanceof ApiError ? error.message : 'erreur inattendue');

export function ReplyForm({
  message,
  draft,
  onDraft,
  fieldId = REPLY_FIELD_ID,
  onSent,
  fill,
}: {
  message: Message;
  draft: ReplyDraft;
  onDraft: (update: (draft: ReplyDraft) => ReplyDraft) => void;
  fieldId?: string;
  onSent?: () => void;
  /** Feuille mobile : le champ prend la hauteur disponible */
  fill?: boolean;
}) {
  const client = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const errorId = `${fieldId}-erreur`;
  // Texte changé (saisie, modèle, envoi réussi) : l'erreur sera revue au prochain envoi
  const [checkedText, setCheckedText] = useState(draft.text);
  if (draft.text !== checkedText) {
    setCheckedText(draft.text);
    if (error) setError(null);
  }

  const send = useMutation({
    mutationFn: () =>
      sendReply(message.documentId, {
        message: draft.text.trim(),
        resolve: draft.resolve,
        ...(draft.attachment ? { attachmentFileId: draft.attachment.id } : {}),
      }),
    onSuccess: () => {
      toast.success(`Réponse envoyée à ${message.email}.`);
      onDraft(() => EMPTY_DRAFT);
      onSent?.();
    },
    onError: (failure) => toast.error(`La réponse n'est pas partie : ${errorText(failure)}`),
    onSettled: () => refreshMessages(client),
  });

  const attach = async (file: File | undefined) => {
    if (!file) return;
    const problem = checkFile(file, TYPES);
    if (problem) {
      setFileError(`${file.name} : ${problem}`);
      return;
    }
    setFileError(null);
    setUploading(true);
    try {
      const uploaded = await trackUpload(uploadFile(file, 'messages'));
      onDraft((current) => ({ ...current, attachment: uploaded }));
    } catch (failure) {
      setFileError(`${file.name} n'a pas pu être envoyé : ${errorText(failure)}`);
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    const text = draft.text.trim();
    const problem = !text
      ? 'Écrivez votre réponse avant de l’envoyer.'
      : text.length > MAX_LENGTH
        ? 'La réponse ne doit pas dépasser 20 000 caractères.'
        : text.includes(RGPD_TEMPLATE_BLANK)
          ? 'Complétez le modèle : remplacez le passage entre crochets par ce que vous envoyez.'
          : null;
    setError(problem);
    if (problem) {
      document.getElementById(fieldId)?.focus();
      return;
    }
    send.mutate();
  };

  return (
    <form
      noValidate
      aria-label={`Répondre à ${senderName(message)}`}
      className={cn('flex flex-col gap-3', fill && 'min-h-0 flex-1')}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label htmlFor={fieldId} className="font-semibold">
        Répondre à {senderName(message)}
      </label>
      <textarea
        id={fieldId}
        value={draft.text}
        onChange={(event) => {
          const text = event.target.value;
          onDraft((current) => ({ ...current, text }));
        }}
        rows={fill ? 10 : 4}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(error && errorId, hintId)}
        className={cn(
          'w-full resize-y rounded-lg border border-border-input bg-surface px-3 py-2.5 leading-relaxed dark:bg-bg',
          fill ? 'min-h-40 flex-1' : 'min-h-[92px]',
          error && 'border-danger',
        )}
      />
      {error && (
        <p id={errorId} className="text-[13px] font-medium text-danger">
          {error}
        </p>
      )}

      {draft.attachment && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-[13px]">
          <Paperclip aria-hidden="true" className="size-4 shrink-0 text-secondary" />
          <span className="min-w-0 flex-1 truncate font-medium">{draft.attachment.name}</span>
          <span className="shrink-0 text-secondary">{describeFile(draft.attachment)}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Retirer ${draft.attachment.name}`}
            onClick={() => onDraft((current) => ({ ...current, attachment: null }))}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      )}
      {fileError && (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {fileError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Button type="button" variant="secondary" disabled={uploading} onClick={() => fileInput.current?.click()}>
          {uploading ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Paperclip aria-hidden="true" />}
          {uploading ? 'Envoi du fichier…' : draft.attachment ? 'Remplacer le fichier' : 'Joindre un fichier'}
        </Button>
        <input
          ref={fileInput}
          type="file"
          tabIndex={-1}
          aria-hidden="true"
          accept={TYPES.join(',')}
          className="hidden"
          onChange={(event) => {
            void attach(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <p id={hintId} className="min-w-0 flex-1 basis-56 text-[13px] text-secondary">
          La réponse est envoyée par e-mail à <span className="break-words">{message.email}</span> et conservée ici.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.resolve}
            onChange={(event) => {
              const resolve = event.target.checked;
              onDraft((current) => ({ ...current, resolve }));
            }}
            className="size-4 accent-brand"
          />
          Marquer comme traité
        </label>
        <Button type="submit" disabled={send.isPending || uploading}>
          {send.isPending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Send aria-hidden="true" />}
          {send.isPending ? 'Envoi…' : 'Envoyer'}
        </Button>
      </div>
    </form>
  );
}

export function ReplySheet({
  message,
  draft,
  onDraft,
  open,
  onOpenChange,
}: {
  message: Message;
  draft: ReplyDraft;
  onDraft: (update: (draft: ReplyDraft) => ReplyDraft) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const returnFocus = useReturnFocus();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Content {...returnFocus} className="fixed inset-0 z-50 flex flex-col bg-surface dark:bg-sidebar">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <Dialog.Title className="text-[17px] font-semibold">Réponse · {message.reference_number}</Dialog.Title>
            <Dialog.Description className="sr-only">Réponse envoyée par e-mail à {message.email}.</Dialog.Description>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-lg" aria-label="Fermer (le texte est gardé)">
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
            <ReplyForm
              message={message}
              draft={draft}
              onDraft={onDraft}
              fieldId={`${REPLY_FIELD_ID}-feuille`}
              onSent={() => onOpenChange(false)}
              fill
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
