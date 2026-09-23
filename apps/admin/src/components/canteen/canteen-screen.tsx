/**
 * Cantine (handoff « 6.13 Cantine — mode détaillé ») : navigation par semaine, école, bascule
 * Détaillé / Simple (PDF), « Dupliquer la semaine précédente », « Publier la semaine ». Mode
 * détaillé : grille lundi → vendredi × Entrée … Goûter (une carte par jour sur mobile), plats avec
 * labels, « Pas de cantine » par jour. Rien n'est enregistré avant « Publier la semaine ».
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBlocker } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Copy, FileText, Loader2, Trash2, Upload, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { CANTEEN_COURSES } from '@communeo/core';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, UnsavedChangesDialog } from '@/components/ui/confirm-dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  dayDate,
  deleteWeek,
  draftHasContent,
  duplicateDraft,
  MEAL_DAYS,
  menuQuery,
  publishWeek,
  refreshCanteen,
  schoolsQuery,
  shiftWeek,
  toDraft,
  weekLabel,
  type CourseKey,
  type MealDay,
  type MealLabel,
  type WeekDraft,
} from '@/lib/canteen';
import { checkFile, describeFile, DOCUMENT_TYPES, IMAGE_TYPES, trackUpload, uploadFile } from '@/lib/media';
import { cn } from '@/lib/utils';
import { DishCell, LabelPills } from './dish-cell';

const errorText = (error: unknown) => (error instanceof ApiError ? error.message : 'erreur inattendue');
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(
    new Date(`${iso}T12:00:00Z`),
  );
const FILE_TYPES = ['application/pdf', ...IMAGE_TYPES];

export interface CanteenSearch {
  semaine?: string;
  ecole?: string;
}

type Change = (patch: Partial<CanteenSearch>) => void;

export function CanteenScreen({ monday, school, onChange }: { monday: string; school: string; onChange: Change }) {
  const client = useQueryClient();
  const menu = useQuery(menuQuery(monday, school));
  const schools = useQuery(schoolsQuery);
  const [draft, setDraft] = useState<WeekDraft | null>(null);
  const [baseline, setBaseline] = useState('');
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [confirm, setConfirm] = useState<'duplicate' | 'delete' | null>(null);
  const [pendingMove, setPendingMove] = useState<Partial<CanteenSearch> | null>(null);
  const [newSchool, setNewSchool] = useState<string | null>(null);
  // Jours ouverts sans plat principal : la publication est refusée tant qu'ils ne sont pas complétés
  const [missing, setMissing] = useState<MealDay[]>([]);
  const [fileMissing, setFileMissing] = useState(false);
  const summary = useRef<HTMLDivElement>(null);

  // Semaine (ou école) chargée : le brouillon repart du menu enregistré
  const key = `${monday}|${school}|${menu.dataUpdatedAt}`;
  if (menu.isSuccess && key !== loadedKey) {
    const next = toDraft(menu.data);
    setLoadedKey(key);
    setDraft(next);
    setBaseline(JSON.stringify(next));
  }
  const dirty = !!draft && JSON.stringify(draft) !== baseline;
  const stillMissing = draft
    ? missing.filter((day) => draft.mode === 'manual' && draft.open[day] && !draft.dishes[day].main.dish.trim())
    : [];
  const blocker = useBlocker({ shouldBlockFn: () => dirty, enableBeforeUnload: () => dirty, withResolver: true });

  // Changer de semaine ou d'école avec des modifications : confirmation
  const move = (patch: Partial<CanteenSearch>) => (dirty ? setPendingMove(patch) : onChange(patch));

  const update = (change: (current: WeekDraft) => WeekDraft) =>
    setDraft((current) => (current ? change(current) : current));
  const setDish = (day: MealDay, course: CourseKey, dish: string, labels: MealLabel[]) =>
    update((current) => ({
      ...current,
      dishes: { ...current.dishes, [day]: { ...current.dishes[day], [course]: { dish, labels } } },
    }));
  const setOpen = (day: MealDay, open: boolean) =>
    update((current) => ({ ...current, open: { ...current.open, [day]: open } }));

  const publish = async (): Promise<boolean> => {
    if (!draft) return false;
    if (draft.mode === 'image' && !draft.file) {
      // Erreur dans la page (un toast couvrirait la barre de publication sur mobile)
      setFileMissing(true);
      requestAnimationFrame(() => document.getElementById('cantine-fichier')?.focus());
      return false;
    }
    const withoutMain =
      draft.mode === 'manual' ? MEAL_DAYS.filter((day) => draft.open[day] && !draft.dishes[day].main.dish.trim()) : [];
    setMissing(withoutMain);
    if (withoutMain.length) {
      requestAnimationFrame(() => summary.current?.focus());
      return false;
    }
    setPublishing(true);
    try {
      await publishWeek(menu.data ?? null, monday, school, draft);
      setBaseline(JSON.stringify(draft));
      toast.success(
        `Menu de la ${weekLabel(monday).toLowerCase()} publié. Il apparaîtra sur le site à la prochaine mise en ligne.`,
      );
      await refreshCanteen(client);
      return true;
    } catch (error) {
      toast.error(`Le menu n'a pas pu être publié : ${errorText(error)}`);
      return false;
    } finally {
      setPublishing(false);
    }
  };

  const duplicate = async () => {
    const previous = await client.fetchQuery(menuQuery(shiftWeek(monday, -1), school));
    if (!previous || !previous.meals?.length) {
      toast.error("La semaine précédente n'a pas de menu détaillé à reprendre.");
      return;
    }
    setDraft(duplicateDraft(previous));
    toast.success('Menu de la semaine précédente repris. Vérifiez-le, puis publiez la semaine.');
  };

  const schoolOptions = [...new Set([...(schools.data ?? []), school, ...(newSchool ? [newSchool] : [])])];
  const status = menu.data
    ? dirty
      ? 'Modifications non publiées'
      : 'Semaine publiée'
    : dirty
      ? 'Menu non publié'
      : 'Pas encore de menu pour cette semaine';

  return (
    <div className="pb-24 md:pb-0">
      <PageHeader
        title="Cantine"
        description="Menus de la semaine"
        actions={
          <Button
            variant="secondary"
            disabled={!draft}
            onClick={() => (draft && draftHasContent(draft) ? setConfirm('duplicate') : void duplicate())}
          >
            <Copy aria-hidden="true" />
            Dupliquer la semaine précédente
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav
          aria-label="Semaine"
          className="flex h-11 items-center rounded-lg border border-border-input bg-surface md:h-10 dark:bg-sidebar"
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label="Semaine précédente"
            onClick={() => move({ semaine: shiftWeek(monday, -1) })}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <p aria-live="polite" className="min-w-[210px] px-2 text-center font-semibold">
            {weekLabel(monday)}
          </p>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Semaine suivante"
            onClick={() => move({ semaine: shiftWeek(monday, 1) })}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
        <SchoolPicker
          schools={schoolOptions}
          value={school}
          onChange={(value) => move({ ecole: value || undefined })}
          onAdd={(name) => {
            setNewSchool(name);
            move({ ecole: name });
          }}
        />
        {draft && (
          <div
            role="radiogroup"
            aria-label="Présentation du menu"
            className="flex rounded-lg border border-border-input bg-surface p-0.5 dark:bg-sidebar"
          >
            {(
              [
                ['manual', 'Détaillé'],
                ['image', 'Simple (PDF)'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={draft.mode === mode}
                onClick={() => update((current) => ({ ...current, mode }))}
                className={cn(
                  'h-10 rounded-md px-3 text-sm font-medium md:h-9',
                  draft.mode === mode ? 'bg-brand-soft font-semibold text-brand' : 'hover:bg-surface-hover',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {menu.isPending || !draft ? (
        <p aria-busy="true" className="rounded-xl border border-border bg-surface p-8 text-center text-secondary">
          Chargement du menu…
        </p>
      ) : menu.isError ? (
        <div role="alert" className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="font-semibold">Le menu n'a pas pu être chargé.</p>
          <Button variant="secondary" className="mt-3" onClick={() => void menu.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : draft.mode === 'manual' ? (
        <>
          {stillMissing.length > 0 && (
            <div
              ref={summary}
              tabIndex={-1}
              role="alert"
              className="mb-3 rounded-lg border border-danger/40 bg-danger-alert-bg px-4 py-3 outline-none"
            >
              <p className="font-semibold text-danger">
                {stillMissing.length > 1 ? `${stillMissing.length} jours sans plat` : '1 jour sans plat'} : la semaine
                n'est pas publiée
              </p>
              <p className="mt-1">
                Indiquez le plat {stillMissing.map((day) => `du ${day}`).join(', ')}, ou cochez « Pas de cantine ».
              </p>
            </div>
          )}
          <DetailedGrid monday={monday} draft={draft} onDish={setDish} onOpen={setOpen} missing={stillMissing} />
          <p className="mt-2 text-[13px] text-secondary">
            Labels par plat : Bio, Local, Fait maison, Végétarien. Cliquez un plat pour le modifier.
          </p>
        </>
      ) : (
        <SimpleMenu
          file={draft.file}
          missing={fileMissing && !draft.file}
          onFile={(file) => update((current) => ({ ...current, file }))}
        />
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-border bg-surface px-4 py-3 md:static md:mt-5 md:rounded-xl md:border dark:bg-sidebar">
        <StatusBadge tone={dirty ? 'warning' : menu.data ? 'success' : 'neutral'} className="hidden sm:inline-flex">
          {status}
        </StatusBadge>
        {menu.data && (
          <Button variant="tertiary" className="text-danger" onClick={() => setConfirm('delete')}>
            <Trash2 aria-hidden="true" />
            <span className="max-sm:sr-only">Supprimer la semaine</span>
          </Button>
        )}
        <Button
          className="ml-auto max-md:h-11 max-md:flex-1"
          disabled={publishing || !dirty}
          onClick={() => void publish()}
        >
          {publishing && <Loader2 aria-hidden="true" className="animate-spin" />}
          Publier la semaine
        </Button>
      </div>

      <ConfirmDialog
        open={confirm === 'duplicate'}
        onOpenChange={(open) => !open && setConfirm(null)}
        tone="warning"
        icon={Copy}
        title="Remplacer ce menu par celui de la semaine précédente ?"
        description="Les plats déjà saisis pour cette semaine seront remplacés. Rien n'est publié avant « Publier la semaine »."
        confirmLabel="Remplacer"
        onConfirm={duplicate}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Supprimer le menu de la ${weekLabel(monday).toLowerCase()} ?`}
        description="Le menu disparaîtra du site à la prochaine mise en ligne."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          try {
            await deleteWeek(menu.data!.documentId);
            toast.success('Menu de la semaine supprimé.');
          } catch (error) {
            toast.error(`Le menu n'a pas pu être supprimé : ${errorText(error)}`);
          }
          await refreshCanteen(client);
        }}
      />
      {(blocker.status === 'blocked' || pendingMove) && (
        <UnsavedChangesDialog
          open
          onStay={() => (pendingMove ? setPendingMove(null) : blocker.reset?.())}
          onLeave={() => {
            if (pendingMove) {
              setBaseline(JSON.stringify(draft));
              onChange(pendingMove);
              setPendingMove(null);
            } else blocker.proceed?.();
          }}
          onSaveAndLeave={async () => {
            const ok = await publish();
            if (pendingMove) {
              if (ok) onChange(pendingMove);
              setPendingMove(null);
            } else if (ok) blocker.proceed?.();
            else blocker.reset?.();
          }}
        />
      )}
    </div>
  );
}

function SchoolPicker({
  schools,
  value,
  onChange,
  onAdd,
}: {
  schools: string[];
  value: string;
  onChange: (value: string) => void;
  onAdd: (name: string) => void;
}) {
  const id = useId();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const input = useRef<HTMLInputElement>(null);
  if (adding) {
    return (
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return input.current?.focus();
          onAdd(name.trim());
          setAdding(false);
          setName('');
        }}
      >
        <label htmlFor={`${id}-nom`} className="sr-only">
          Nom de l'école
        </label>
        <input
          ref={input}
          id={`${id}-nom`}
          autoFocus
          value={name}
          maxLength={100}
          placeholder="Nom de l'école"
          onChange={(event) => setName(event.target.value)}
          className="h-11 w-56 rounded-lg border border-border-input bg-surface px-3 md:h-10 dark:bg-sidebar"
        />
        <Button type="submit" variant="secondary">
          Ajouter
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Annuler l'ajout d'une école"
          onClick={() => setAdding(false)}
        >
          <X aria-hidden="true" />
        </Button>
      </form>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <label htmlFor={`${id}-ecole`} className="sr-only">
        École
      </label>
      <select
        id={`${id}-ecole`}
        value={value}
        onChange={(event) => (event.target.value === '__nouvelle' ? setAdding(true) : onChange(event.target.value))}
        className="h-11 max-w-[260px] rounded-lg border border-border-input bg-surface pr-8 pl-3 md:h-10 dark:bg-sidebar"
      >
        {schools.map((school) => (
          <option key={school} value={school}>
            {school || 'Toutes les écoles'}
          </option>
        ))}
        <option value="__nouvelle">Ajouter une école…</option>
      </select>
    </div>
  );
}

function DetailedGrid({
  monday,
  draft,
  onDish,
  onOpen,
  missing,
}: {
  monday: string;
  draft: WeekDraft;
  onDish: (day: MealDay, course: CourseKey, dish: string, labels: MealLabel[]) => void;
  onOpen: (day: MealDay, open: boolean) => void;
  missing: MealDay[];
}) {
  return (
    <>
      {/* Ordinateur : grille jour × plat */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface md:block">
        <table className="w-full min-w-[760px] table-fixed border-collapse">
          <caption className="sr-only">Menu de la {weekLabel(monday).toLowerCase()}, par jour et par plat</caption>
          <thead>
            <tr className="border-b border-border-row">
              <td className="w-[150px]" />
              {MEAL_DAYS.map((day, index) => (
                <th key={day} scope="col" className="px-2 py-2.5 text-left align-top">
                  <span className="block text-xs font-semibold tracking-wide text-secondary uppercase">
                    {day} <span className="font-normal normal-case">{shortDate(dayDate(monday, index))}</span>
                  </span>
                  <label className="mt-1 flex items-center gap-1.5 text-[12px] font-normal text-secondary">
                    <input
                      type="checkbox"
                      checked={!draft.open[day]}
                      onChange={(event) => onOpen(day, !event.target.checked)}
                      className="size-3.5 accent-brand"
                    />
                    Pas de cantine
                  </label>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CANTEEN_COURSES.map((course, row) => (
              <tr key={course.key} className="border-b border-border-row last:border-b-0">
                <th scope="row" className="px-4 py-2 text-left text-[13px] font-medium text-secondary">
                  {course.label}
                </th>
                {MEAL_DAYS.map((day) => (
                  <td key={day} className="px-2 py-1.5 align-top">
                    {draft.open[day] ? (
                      <DishCell
                        label={`${capitalize(day)}, ${course.label}`}
                        dish={draft.dishes[day][course.key].dish}
                        labels={draft.dishes[day][course.key].labels}
                        onChange={(dish, labels) => onDish(day, course.key, dish, labels)}
                        invalid={course.key === 'main' && missing.includes(day)}
                      />
                    ) : (
                      <span className="block px-2 py-1.5 text-center text-[13px] text-secondary">
                        {row === CANTEEN_COURSES.length - 1 ? 'Pas de cantine' : '—'}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : une carte par jour */}
      <ul className="space-y-3 md:hidden">
        {MEAL_DAYS.map((day, index) => (
          <li key={day} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">
                {capitalize(day)} {shortDate(dayDate(monday, index))}
              </h2>
              <label className="flex items-center gap-2 text-[13px] text-secondary">
                <input
                  type="checkbox"
                  checked={!draft.open[day]}
                  onChange={(event) => onOpen(day, !event.target.checked)}
                  className="size-4 accent-brand"
                />
                Pas de cantine
              </label>
            </div>
            {draft.open[day] ? (
              <ul className="mt-2 divide-y divide-border-row">
                {CANTEEN_COURSES.map((course) => {
                  const entry = draft.dishes[day][course.key];
                  return (
                    <li key={course.key} className="py-1">
                      <DishCell
                        label={`${capitalize(day)}, ${course.label}`}
                        dish={entry.dish}
                        labels={entry.labels}
                        onChange={(dish, labels) => onDish(day, course.key, dish, labels)}
                        invalid={course.key === 'main' && missing.includes(day)}
                        className="min-h-11 border-transparent text-left"
                      >
                        <span className="flex items-start gap-3">
                          <span className="w-28 shrink-0 text-secondary">{course.label}</span>
                          <span className="min-w-0 flex-1">
                            <span className={cn('block break-words', !entry.dish && 'text-secondary')}>
                              {entry.dish || '—'}
                            </span>
                            <LabelPills labels={entry.labels} />
                          </span>
                        </span>
                      </DishCell>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] text-secondary">Pas de cantine ce jour-là.</p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function SimpleMenu({
  file,
  missing,
  onFile,
}: {
  file: WeekDraft['file'];
  /** Publication demandée sans fichier */
  missing: boolean;
  onFile: (file: WeekDraft['file']) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const attach = async (chosen: File | undefined) => {
    if (!chosen) return;
    const problem = checkFile(chosen, FILE_TYPES.includes(chosen.type) ? FILE_TYPES : DOCUMENT_TYPES);
    if (problem || !FILE_TYPES.includes(chosen.type)) {
      setError(`${chosen.name} : ${problem ?? 'Format non accepté : PDF, JPG, PNG ou WebP.'}`);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      onFile(await trackUpload(uploadFile(chosen, 'cantine')));
    } catch (failure) {
      setError(`${chosen.name} n'a pas pu être envoyé : ${errorText(failure)}`);
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="font-semibold">Menu de la semaine (PDF ou image)</p>
      <p className="mt-0.5 text-[13px] text-secondary">
        Le fichier du prestataire, tel quel. Le site affiche un lien de téléchargement ou l'image.
      </p>
      {file ? (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
          <FileText aria-hidden="true" className="size-5 shrink-0 text-secondary" />
          <div className="min-w-0 flex-1">
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="block truncate font-medium text-text underline-offset-2 hover:underline"
            >
              {file.name}
            </a>
            <p className="text-[13px] text-secondary">{describeFile(file)}</p>
          </div>
          <Button variant="secondary" size="sm" disabled={uploading} onClick={() => input.current?.click()}>
            Remplacer
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Retirer ${file.name}`} onClick={() => onFile(null)}>
            <X aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <Button
          id="cantine-fichier"
          variant="secondary"
          className={cn('mt-3', missing && 'border-2 border-danger')}
          disabled={uploading}
          aria-describedby={missing ? 'cantine-fichier-erreur' : undefined}
          onClick={() => input.current?.click()}
        >
          {uploading ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Upload aria-hidden="true" />}
          {uploading ? 'Envoi du fichier…' : 'Choisir le fichier'}
        </Button>
      )}
      <input
        ref={input}
        type="file"
        tabIndex={-1}
        aria-hidden="true"
        accept={FILE_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          void attach(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {missing && !error && (
        <p id="cantine-fichier-erreur" role="alert" className="mt-2 text-[13px] font-medium text-danger">
          Joignez le menu (PDF ou image) avant de publier la semaine.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[13px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
