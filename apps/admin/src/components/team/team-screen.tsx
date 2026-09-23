/**
 * Équipe municipale (handoff 6.13) : groupes fixes Maire, Adjoints, Conseillers municipaux, Services
 * de la mairie, chacun réordonnable (Monter / Descendre, glisser-déposer au clavier) ; l'ordre est
 * celui de la page du site. La fiche s'ouvre dans un panneau latéral ; la photo est facultative
 * (initiales à défaut). Pas de brouillon : chaque action est enregistrée tout de suite.
 */
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type Announcements, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS as DndCSS } from '@dnd-kit/utilities';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ChevronDown, GripVertical, Pencil, Plus, Users } from 'lucide-react';
import { useRef, useState } from 'react';
import { TEAM_GROUPS, TEAM_ROLE_TITLES } from '@communeo/core';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { rank, stepCoordinates } from '@/lib/dnd';
import { deleteMember, fullName, saveMember, saveOrder, teamQuery, type TeamMember, type TeamRole } from '@/lib/team';
import { cn, initials } from '@/lib/utils';
import { MemberSheet } from './member-sheet';

type Group = (typeof TEAM_GROUPS)[number];

/** Rôle proposé pour une personne ajoutée dans un groupe */
const GROUP_ROLE: Record<Group['key'], TeamRole> = { maire: 'maire', adjoints: 'adjoint', conseillers: 'conseiller', services: 'agent' };
const GROUP_EMPTY: Record<Group['key'], string> = { maire: 'Aucun maire renseigné.', adjoints: 'Aucun adjoint renseigné.', conseillers: 'Aucun conseiller renseigné.', services: 'Aucun service renseigné.' };

const errorText = (error: unknown) => (error instanceof ApiError ? error.message : 'erreur inattendue');
const subtitle = (member: TeamMember) => [member.title?.trim() || TEAM_ROLE_TITLES[member.role], member.delegation].filter(Boolean).join(' · ');

export function TeamScreen() {
  const client = useQueryClient();
  const team = useQuery(teamQuery);
  const [sheet, setSheet] = useState<{ member: TeamMember | null; role: TeamRole } | null>(null);
  const [message, setMessage] = useState('');
  // Groupes longs repliés par défaut (plus de 6 personnes), sauf ouverture par l'utilisateur
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const members = team.data ?? [];
  const byGroup = (group: Group) => members.filter((member) => (group.roles as readonly string[]).includes(member.role));
  const elected = members.filter((member) => member.role !== 'dgs' && member.role !== 'agent').length;
  const services = members.length - elected;

  const refresh = () => client.invalidateQueries({ queryKey: teamQuery.queryKey });

  const reorder = async (group: Group, from: number, to: number, focus?: { key: string; action: string }) => {
    const list = byGroup(group);
    if (to < 0 || to >= list.length) return;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    // Affichage immédiat, enregistrement ensuite (annulé en cas d'échec)
    const previous = client.getQueryData(teamQuery.queryKey);
    const ordered = next.map((member, index) => ({ ...member, display_order: (index + 1) * 10 }));
    client.setQueryData(teamQuery.queryKey, (current) => (current ?? []).map((member) => ordered.find((item) => item.documentId === member.documentId) ?? member).sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999)));
    if (focus) {
      setMessage(`${fullName(moved!)} : ${rank(to, list.length)} du groupe ${group.label}.`);
      requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-member="${focus.key}"] [data-action="${focus.action}"]:not(:disabled)`)?.focus() ?? document.querySelector<HTMLButtonElement>(`[data-member="${focus.key}"] [data-action]:not(:disabled)`)?.focus());
    }
    try {
      await saveOrder(next);
    } catch (error) {
      client.setQueryData(teamQuery.queryKey, previous);
      toast.error(`Le nouvel ordre n'a pas pu être enregistré : ${errorText(error)}`);
    }
    void refresh();
  };

  return (
    <div>
      <PageHeader
        title="Équipe municipale"
        description={team.data ? `${elected} élu${elected > 1 ? 's' : ''} · ${services} service${services > 1 ? 's' : ''}` : undefined}
        actions={
          <Button onClick={() => setSheet({ member: null, role: 'conseiller' })}>
            <Plus aria-hidden="true" />
            Ajouter une personne
          </Button>
        }
      />
      <div role="status" className="sr-only">
        {message}
      </div>

      {team.isPending ? (
        <div aria-busy="true" className="space-y-3">
          <span className="sr-only">Chargement de l'équipe</span>
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-16 max-w-[760px] rounded-xl bg-border-row motion-safe:animate-pulse" />
          ))}
        </div>
      ) : team.isError ? (
        <div role="alert" className="rounded-xl border border-danger bg-danger-alert-bg p-6">
          <p>L'équipe n'a pas pu être chargée.</p>
          <Button variant="secondary" className="mt-3" onClick={() => void team.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : members.length === 0 ? (
        <div className="max-w-[760px] rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <span aria-hidden="true" className="mx-auto grid size-14 place-items-center rounded-full bg-brand-soft text-brand">
            <Users className="size-6" />
          </span>
          <h2 className="mt-4 text-[17px]">Présentez l'équipe municipale</h2>
          <p className="mx-auto mt-2 max-w-md text-secondary">Le maire, les adjoints et leurs délégations, les conseillers, les services de la mairie. Une photo n'est pas obligatoire.</p>
          <Button className="mt-5" onClick={() => setSheet({ member: null, role: 'maire' })}>
            <Plus aria-hidden="true" />
            Ajouter le maire
          </Button>
        </div>
      ) : (
        <div className="max-w-[760px] space-y-4">
          {TEAM_GROUPS.map((group) => {
            const list = byGroup(group);
            const expanded = open[group.key] ?? list.length <= 6;
            const panelId = `groupe-${group.key}`;
            return (
              <section key={group.key} aria-labelledby={`${panelId}-titre`} className={cn('rounded-xl border bg-surface dark:bg-sidebar', expanded && list.length > 0 ? 'border-brand' : 'border-border')}>
                <h2 id={`${panelId}-titre`} className="text-base">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => setOpen((current) => ({ ...current, [group.key]: !expanded }))}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <span className="flex-1 text-xs font-semibold tracking-[0.06em] text-secondary uppercase">{group.label}</span>
                    <span className="text-[13px] font-normal text-secondary">
                      {list.length}
                      {list.length > 1 && expanded && ' · l’ordre est celui du site'}
                    </span>
                    <ChevronDown aria-hidden="true" className={cn('size-4 text-secondary motion-safe:transition-transform', expanded && 'rotate-180')} />
                  </button>
                </h2>
                <div id={panelId} hidden={!expanded} className="border-t border-border-row">
                  {list.length === 0 ? (
                    <p className="px-4 py-3 text-[13px] text-secondary">{GROUP_EMPTY[group.key]}</p>
                  ) : (
                    <MemberList group={group} members={list} onMove={(from, to, focus) => void reorder(group, from, to, focus)} onEdit={(member) => setSheet({ member, role: member.role })} />
                  )}
                  <div className="border-t border-border-row px-4 py-2.5">
                    <Button type="button" variant="tertiary" size="sm" onClick={() => setSheet({ member: null, role: GROUP_ROLE[group.key] })}>
                      <Plus aria-hidden="true" />
                      Ajouter dans « {group.label} »
                    </Button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <MemberSheet
        open={sheet !== null}
        member={sheet?.member ?? null}
        defaultRole={sheet?.role ?? 'conseiller'}
        onClose={() => setSheet(null)}
        onSave={async (data) => {
          try {
            const editing = sheet?.member;
            // Nouvelle personne, ou changement de groupe : à la fin de son groupe
            const group = TEAM_GROUPS.find((item) => (item.roles as readonly string[]).includes(data.role))!;
            const sameGroup = editing && (group.roles as readonly string[]).includes(editing.role);
            const last = Math.max(0, ...byGroup(group).map((member) => member.display_order ?? 0));
            await saveMember(editing?.documentId ?? null, { ...data, ...(sameGroup ? {} : { display_order: last + 10 }) });
            await refresh();
            setSheet(null);
            toast.success(`Fiche de ${data.first_name} ${data.last_name} enregistrée. Elle sera en ligne à la prochaine mise en ligne du site.`);
          } catch (error) {
            toast.error(`La fiche n'a pas pu être enregistrée : ${errorText(error)}`);
            throw error;
          }
        }}
        onDelete={async () => {
          const member = sheet?.member;
          if (!member) return;
          await deleteMember(member.documentId);
          await refresh();
          setSheet(null);
          toast.success(`La fiche de ${fullName(member)} a été supprimée.`);
        }}
      />
    </div>
  );
}

function MemberList({ group, members, onMove, onEdit }: { group: Group; members: TeamMember[]; onMove: (from: number, to: number, focus?: { key: string; action: string }) => void; onEdit: (member: TeamMember) => void }) {
  const keys = members.map((member) => member.documentId);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: stepCoordinates(keys) }));
  const indexOf = (id: string | number) => keys.indexOf(String(id));
  const lastOver = useRef<string | number | null>(null);
  const dragged = useRef('');
  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      lastOver.current = active.id;
      dragged.current = fullName(members[indexOf(active.id)]!);
      return `${dragged.current} saisi, ${rank(indexOf(active.id), members.length)}. Flèches haut et bas pour déplacer, Espace pour déposer, Échap pour annuler.`;
    },
    onDragOver: ({ over }) => {
      if ((over?.id ?? null) === lastOver.current) return undefined;
      lastOver.current = over?.id ?? null;
      return over ? `${dragged.current} en ${rank(indexOf(over.id), members.length)}.` : undefined;
    },
    onDragEnd: ({ over }) => (over ? `${dragged.current} déplacé en ${rank(indexOf(over.id), members.length)}.` : `${dragged.current} reposé.`),
    onDragCancel: ({ active }) => `Déplacement annulé, ${dragged.current} reste en ${rank(indexOf(active.id), members.length)}.`,
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }: DragEndEvent) => over && active.id !== over.id && onMove(indexOf(active.id), indexOf(over.id))}
      accessibility={{ announcements, screenReaderInstructions: { draggable: 'Pour déplacer cette personne, appuyez sur Espace ou Entrée, puis utilisez les flèches haut et bas. Espace ou Entrée pour déposer, Échap pour annuler.' } }}
    >
      <SortableContext items={keys} strategy={verticalListSortingStrategy}>
        <ol aria-label={group.label} className="divide-y divide-border-row">
          {members.map((member, index) => (
            <MemberRow key={member.documentId} member={member} index={index} total={members.length} onMove={onMove} onEdit={() => onEdit(member)} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function MemberRow({ member, index, total, onMove, onEdit }: { member: TeamMember; index: number; total: number; onMove: (from: number, to: number, focus?: { key: string; action: string }) => void; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: member.documentId });
  const name = fullName(member);
  const photo = member.photo?.formats?.thumbnail?.url ?? member.photo?.url;
  return (
    <li
      ref={setNodeRef}
      data-member={member.documentId}
      style={{ transform: DndCSS.Transform.toString(transform), transition }}
      className={cn('flex items-center gap-3 bg-surface px-4 py-2.5 dark:bg-sidebar', isDragging && 'relative z-10 shadow-[0_12px_32px_rgb(28_27_24/0.22)]')}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Déplacer ${name}, ${rank(index, total)}`}
        className="grid size-8 shrink-0 cursor-grab place-items-center rounded-md text-border-input hover:bg-surface-hover hover:text-text active:cursor-grabbing"
      >
        <GripVertical aria-hidden="true" className="size-4" />
      </button>
      {photo ? (
        <img src={photo} alt="" className="size-10 shrink-0 rounded-full object-cover" />
      ) : (
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand">
          {initials(name)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{name}</p>
        <p className="truncate text-[13px] text-secondary">{subtitle(member)}</p>
      </div>
      <Button type="button" variant="ghost" size="icon" className="size-8 disabled:opacity-35" data-action="monter" aria-label={`Monter ${name}`} disabled={index === 0} onClick={() => onMove(index, index - 1, { key: member.documentId, action: 'monter' })}>
        <ArrowUp aria-hidden="true" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-8 disabled:opacity-35" data-action="descendre" aria-label={`Descendre ${name}`} disabled={index === total - 1} onClick={() => onMove(index, index + 1, { key: member.documentId, action: 'descendre' })}>
        <ArrowDown aria-hidden="true" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-8" data-action="modifier" aria-label={`Modifier la fiche de ${name}`} onClick={onEdit}>
        <Pencil aria-hidden="true" />
      </Button>
    </li>
  );
}
