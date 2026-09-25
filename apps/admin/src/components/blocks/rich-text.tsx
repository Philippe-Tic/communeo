/**
 * Texte riche des blocs : TipTap limité aux nœuds et marques acceptés par @communeo/core
 * (paragraphes, H2 / H3, listes, gras, italique, liens sûrs). Un H1 ou du HTML collé est ramené
 * à ces éléments par le schéma de l'éditeur : impossible de produire autre chose.
 */
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Link2, List, ListOrdered } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Controller, useFormContext, type FieldValues, type Path } from 'react-hook-form';
import type { RichTextDocument } from '@communeo/core';
import { FieldError, FieldHelp, fieldId, RequirementMark } from '@/components/form/field';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { emptyDoc } from './catalog';

const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;
const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238f8c7e' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

function extensions(headings: boolean) {
  return [
    StarterKit.configure({
      heading: headings ? { levels: [2, 3] } : false,
      blockquote: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
      strike: false,
      underline: false,
      dropcursor: false,
      gapcursor: false,
      trailingNode: false,
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: 'https',
        protocols: ['mailto', 'tel'],
        isAllowedUri: (url) => SAFE_HREF.test(url),
        HTMLAttributes: { rel: null, target: null, class: null },
      },
    }),
  ];
}

type BlockStyle = 'paragraph' | 'h2' | 'h3';

function Toolbar({ editor, headings, labelId, linkOpen, setLinkOpen }: { editor: Editor; headings: boolean; labelId: string; linkOpen: boolean; setLinkOpen: (open: boolean | ((open: boolean) => boolean)) => void }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      style: (e.isActive('heading', { level: 2 }) ? 'h2' : e.isActive('heading', { level: 3 }) ? 'h3' : 'paragraph') as BlockStyle,
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      link: e.isActive('link'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
    }),
  });
  const toolbar = useRef<HTMLDivElement>(null);
  const styleId = useId();

  // Dernière sélection dans le texte : la liste des styles prend le focus, la sélection de l'éditeur
  // serait sinon perdue et le style appliqué au premier paragraphe
  const selection = useRef({ from: 1, to: 1 });
  useEffect(() => {
    const save = () => {
      if (editor.isFocused) selection.current = { from: editor.state.selection.from, to: editor.state.selection.to };
    };
    save();
    editor.on('selectionUpdate', save);
    editor.on('update', save);
    return () => {
      editor.off('selectionUpdate', save);
      editor.off('update', save);
    };
  }, [editor]);

  /** Au moment où la liste prend le focus, la sélection du navigateur est encore dans le texte */
  const captureSelection = () => {
    const dom = window.getSelection();
    if (!dom?.anchorNode || !dom.focusNode || !editor.view.dom.contains(dom.anchorNode)) return;
    try {
      const anchor = editor.view.posAtDOM(dom.anchorNode, dom.anchorOffset);
      const head = editor.view.posAtDOM(dom.focusNode, dom.focusOffset);
      selection.current = { from: Math.min(anchor, head), to: Math.max(anchor, head) };
    } catch {
      /* position introuvable : on garde la dernière sélection connue */
    }
  };

  // Une seule commande atteignable par tabulation (la première au départ)
  useEffect(() => {
    const items = Array.from(toolbar.current?.querySelectorAll<HTMLElement>('[data-toolbar-item]') ?? []);
    if (!items.some((item) => item.tabIndex === 0) && items[0]) items[0].tabIndex = 0;
  }, []);

  // Barre d'outils : une seule tabulation, flèches gauche / droite entre les commandes
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    if (event.target instanceof HTMLSelectElement && (event.key === 'Home' || event.key === 'End')) return;
    const items = Array.from(toolbar.current?.querySelectorAll<HTMLElement>('[data-toolbar-item]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
    items.forEach((item, i) => (item.tabIndex = i === next ? 0 : -1));
    items[next]?.focus();
  };

  const toggle = (label: string, active: boolean, icon: React.ReactNode, run: () => void, shortcut?: string) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      data-toolbar-item
      tabIndex={-1}
      aria-pressed={active}
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      className="size-8 aria-pressed:bg-brand-soft aria-pressed:text-brand"
      onMouseDown={(event) => event.preventDefault()}
      onClick={run}
    >
      {icon}
    </Button>
  );

  return (
    <>
    <div
      ref={toolbar}
      role="toolbar"
      aria-label="Mise en forme"
      aria-controls={labelId}
      onKeyDown={onKeyDown}
      className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-border-input bg-sidebar px-2 py-1.5"
    >
      {headings && (
        <>
          <label htmlFor={styleId} className="sr-only">
            Style du paragraphe
          </label>
          <select
            id={styleId}
            data-toolbar-item
            tabIndex={-1}
            onPointerDown={captureSelection}
            onFocus={captureSelection}
            value={state.style}
            onChange={(event) => {
              captureSelection();
              const chain = editor.chain().focus().setTextSelection(selection.current);
              const value = event.target.value as BlockStyle;
              if (value === 'paragraph') chain.setParagraph().run();
              else chain.setHeading({ level: value === 'h2' ? 2 : 3 }).run();
            }}
            className="h-8 appearance-none rounded-md border border-border-input bg-surface bg-[length:14px] bg-[right_8px_center] bg-no-repeat pr-7 pl-2.5 text-[13px] dark:bg-sidebar"
            style={{ backgroundImage: CHEVRON }}
          >
            <option value="paragraph">Paragraphe</option>
            <option value="h2">Titre (h2)</option>
            <option value="h3">Sous-titre (h3)</option>
          </select>
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
        </>
      )}
      {toggle('Gras', state.bold, <Bold aria-hidden="true" />, () => editor.chain().focus().toggleBold().run(), 'Ctrl+B')}
      {toggle('Italique', state.italic, <Italic aria-hidden="true" />, () => editor.chain().focus().toggleItalic().run(), 'Ctrl+I')}
      {toggle('Lien', state.link, <Link2 aria-hidden="true" />, () => setLinkOpen((open) => !open), 'Ctrl+K')}
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
      {toggle('Liste à puces', state.bullet, <List aria-hidden="true" />, () => editor.chain().focus().toggleBulletList().run())}
      {toggle('Liste numérotée', state.ordered, <ListOrdered aria-hidden="true" />, () => editor.chain().focus().toggleOrderedList().run())}
      {headings && <span className="ml-auto hidden pr-1 text-xs text-secondary lg:inline">Titre = niveau 2 · Sous-titre = niveau 3</span>}
    </div>
    {linkOpen && <LinkForm editor={editor} onClose={() => setLinkOpen(false)} />}
    </>
  );
}

/** Saisie d'un lien sur la sélection : http(s), mailto:, tel: ou chemin interne seulement */
function LinkForm({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const current = (editor.getAttributes('link').href as string | undefined) ?? '';
  const [href, setHref] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  useEffect(() => input.current?.focus(), []);

  const apply = () => {
    const value = href.trim();
    if (!value) return remove();
    const normalized = /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(value) ? `https://${value}` : value;
    if (!SAFE_HREF.test(normalized)) {
      setError('Adresse non autorisée : commencez par https://, mailto:, tel: ou /');
      return;
    }
    const chain = editor.chain().focus().extendMarkRange('link');
    if (editor.state.selection.empty && !editor.isActive('link')) chain.insertContent({ type: 'text', text: normalized, marks: [{ type: 'link', attrs: { href: normalized } }] }).run();
    else chain.setLink({ href: normalized }).run();
    onClose();
  };
  const remove = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    onClose();
  };

  return (
    <div
      className="flex w-full flex-wrap items-end gap-2 border border-b-0 border-border-input bg-sidebar px-3 py-2.5"
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
          editor.commands.focus();
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          apply();
        }
      }}
    >
      <div className="min-w-60 flex-1">
        <label htmlFor={id} className="text-[13px] font-medium">
          Adresse du lien
        </label>
        <input
          ref={input}
          id={id}
          type="url"
          inputMode="url"
          value={href}
          onChange={(event) => {
            setHref(event.target.value);
            setError(null);
          }}
          placeholder="https://… ou /demarches"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-erreur` : undefined}
          className="mt-1 block h-9 w-full rounded-lg border border-border-input bg-surface px-3 text-sm aria-invalid:border-2 aria-invalid:border-danger dark:bg-sidebar"
        />
        <FieldError id={id} message={error ?? undefined} />
      </div>
      <Button type="button" size="sm" onClick={apply}>
        Appliquer
      </Button>
      {current && (
        <Button type="button" size="sm" variant="tertiary" onClick={remove}>
          Retirer le lien
        </Button>
      )}
      <Button type="button" size="sm" variant="secondary" onClick={onClose}>
        Annuler
      </Button>
    </div>
  );
}

function RichTextInput({
  value,
  onChange,
  onBlur,
  headings,
  labelId,
  controlId,
  describedBy,
  invalid,
}: {
  value: RichTextDocument | null | undefined;
  onChange: (doc: RichTextDocument) => void;
  onBlur: () => void;
  headings: boolean;
  labelId: string;
  controlId: string;
  describedBy?: string;
  invalid: boolean;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const editor = useEditor({
    extensions: extensions(headings),
    content: value ?? emptyDoc(),
    immediatelyRender: true,
    editorProps: {
      attributes: {
        id: controlId,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': labelId,
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        ...(invalid ? { 'aria-invalid': 'true' } : {}),
        class: cn(
          'prose-admin min-h-28 rounded-b-lg border border-border-input bg-surface px-4 py-3.5 text-[15px] leading-relaxed outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-sidebar',
          invalid && 'border-2 border-danger',
        ),
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as RichTextDocument),
    onBlur: () => onBlur(),
  });

  // Attributs d'accessibilité à jour quand l'erreur apparaît ou disparaît
  useEffect(() => {
    if (!editor) return;
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: {
          ...(editor.options.editorProps.attributes as Record<string, string>),
          ...(describedBy ? { 'aria-describedby': describedBy } : { 'aria-describedby': '' }),
          'aria-invalid': invalid ? 'true' : 'false',
          class: cn(
            'prose-admin min-h-28 rounded-b-lg border border-border-input bg-surface px-4 py-3.5 text-[15px] leading-relaxed outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-sidebar',
            invalid && 'border-2 border-danger',
          ),
        },
      },
    });
  }, [editor, describedBy, invalid]);

  if (!editor) return null;
  return (
    <div>
      <Toolbar editor={editor} headings={headings} labelId={controlId} linkOpen={linkOpen} setLinkOpen={setLinkOpen} />
      <EditorContent
        editor={editor}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            setLinkOpen(true);
          }
        }}
      />
    </div>
  );
}

/** Champ de texte riche relié au formulaire (le même Field que les autres champs) */
export function RichTextField<T extends FieldValues>({
  name,
  label,
  headings = true,
  required,
  help,
  hideLabel,
}: {
  name: Path<T>;
  label: string;
  headings?: boolean;
  required?: boolean;
  help?: string;
  /** Libellé masqué visuellement (le titre de la carte du bloc le porte déjà), toujours lu */
  hideLabel?: boolean;
}) {
  const { control } = useFormContext<T>();
  const id = fieldId(name);
  const labelId = `${id}-libelle`;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message;
        const describedBy = [help && `${id}-aide`, error && `${id}-erreur`].filter(Boolean).join(' ') || undefined;
        return (
          <div data-field={name}>
            <p id={labelId} className={hideLabel ? 'sr-only' : 'mb-1.5 font-medium'}>
              {label}
              <RequirementMark required={required} />
            </p>
            <RichTextInput
              value={field.value as RichTextDocument}
              onChange={field.onChange}
              onBlur={field.onBlur}
              headings={headings}
              labelId={labelId}
              controlId={id}
              describedBy={describedBy}
              invalid={!!error}
            />
            {help && <FieldHelp id={id}>{help}</FieldHelp>}
            <FieldError id={id} message={error} />
          </div>
        );
      }}
    />
  );
}
