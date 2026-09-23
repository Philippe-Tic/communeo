/**
 * Collecte des déchets (handoff 6.13) : tableau Type · Jour · Fréquence · Zone · ✎ (cartes sur
 * mobile), « Ajouter une collecte », puis les notes affichées en tête de la page du site. Pas de
 * brouillon : chaque enregistrement part à la prochaine mise en ligne.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Plus, Recycle } from 'lucide-react';
import { useId, useState } from 'react';
import { wasteFrequencyLabel } from '@communeo/core';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { sessionQuery } from '@/lib/session';
import { saveSiteSettings, siteSettingsQuery } from '@/lib/site-settings';
import { deleteSchedule, refreshWaste, saveSchedule, wasteQuery, type WasteSchedule } from '@/lib/waste';
import { cn } from '@/lib/utils';
import { CollectionSheet, typeLabel } from './collection-sheet';

const errorText = (error: unknown) => (error instanceof ApiError ? error.message : 'erreur inattendue');
const dayLabel = (schedule: WasteSchedule) =>
  schedule.collection_day ? schedule.collection_day.charAt(0).toUpperCase() + schedule.collection_day.slice(1) : '—';
const frequencyText = (schedule: WasteSchedule) =>
  // Le jour a sa colonne : « Le 1er mercredi du mois » devient « 1er du mois »
  schedule.frequency === 'mensuel' && schedule.month_rank
    ? wasteFrequencyLabel({ ...schedule, collection_day: null }).replace(
        'Une fois par mois',
        `${schedule.month_rank === 5 ? 'Dernier' : schedule.month_rank === 1 ? '1er' : `${schedule.month_rank}e`} du mois`,
      )
    : wasteFrequencyLabel(schedule);

export function WasteScreen() {
  const client = useQueryClient();
  const waste = useQuery(wasteQuery);
  const [sheet, setSheet] = useState<{ schedule: WasteSchedule | null } | null>(null);
  const rows = waste.data ?? [];

  return (
    <div className="max-w-[960px]">
      <PageHeader
        title="Collecte des déchets"
        description={waste.data ? `${rows.length} collecte${rows.length > 1 ? 's' : ''}` : undefined}
        actions={
          <Button onClick={() => setSheet({ schedule: null })}>
            <Plus aria-hidden="true" />
            Ajouter une collecte
          </Button>
        }
      />

      {waste.isPending ? (
        <p aria-busy="true" className="p-8 text-center text-secondary">
          Chargement des collectes…
        </p>
      ) : waste.isError ? (
        <div role="alert" className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="font-semibold">Les collectes n'ont pas pu être chargées.</p>
          <Button variant="secondary" className="mt-3" onClick={() => void waste.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <span
            aria-hidden="true"
            className="mx-auto grid size-14 place-items-center rounded-full bg-brand-soft text-brand"
          >
            <Recycle className="size-6" />
          </span>
          <h2 className="mt-4 text-[17px]">Indiquez les jours de collecte</h2>
          <p className="mx-auto mt-2 max-w-md text-secondary">
            Ordures ménagères, tri, verre… Le site affiche le calendrier et la prochaine collecte de chaque type,
            calculée automatiquement.
          </p>
          <Button className="mt-5" onClick={() => setSheet({ schedule: null })}>
            <Plus aria-hidden="true" />
            Ajouter une collecte
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface md:overflow-hidden">
          <table className="hidden w-full border-collapse md:table">
            <caption className="sr-only">Collectes des déchets de la commune</caption>
            <thead>
              <tr className="border-b border-border-row text-left text-xs font-semibold tracking-wide text-secondary uppercase">
                <th scope="col" className="py-3 pl-4 font-semibold">
                  Type
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Jour
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Fréquence
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Zone
                </th>
                <th scope="col" className="w-14 py-3 pr-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((schedule) => (
                <tr
                  key={schedule.documentId}
                  className={cn('border-b border-border-row last:border-b-0', !schedule.active && 'text-secondary')}
                >
                  <th scope="row" className="py-3 pl-4 text-left font-semibold">
                    {typeLabel(schedule.waste_type)}
                    {!schedule.active && (
                      <StatusBadge tone="neutral" className="ml-2 align-middle">
                        Masquée
                      </StatusBadge>
                    )}
                  </th>
                  <td className="px-3">{dayLabel(schedule)}</td>
                  <td className="px-3">{frequencyText(schedule)}</td>
                  <td className="px-3">{schedule.zone ?? 'Toute la commune'}</td>
                  <td className="pr-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Modifier la collecte « ${typeLabel(schedule.waste_type)} »${schedule.zone ? ` (${schedule.zone})` : ''}`}
                      onClick={() => setSheet({ schedule })}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-border-row md:hidden">
            {rows.map((schedule) => (
              <li key={schedule.documentId} className="flex items-start gap-2 py-3 pr-2 pl-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {typeLabel(schedule.waste_type)}
                    {!schedule.active && (
                      <StatusBadge tone="neutral" className="ml-2 align-middle">
                        Masquée
                      </StatusBadge>
                    )}
                  </p>
                  <p className="mt-0.5 text-[13px] text-secondary">
                    {[
                      schedule.collection_day ? dayLabel(schedule) : null,
                      frequencyText(schedule),
                      schedule.zone ?? 'Toute la commune',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label={`Modifier la collecte « ${typeLabel(schedule.waste_type)} »${schedule.zone ? ` (${schedule.zone})` : ''}`}
                  onClick={() => setSheet({ schedule })}
                >
                  <Pencil aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <SiteNotes />

      <CollectionSheet
        open={!!sheet}
        schedule={sheet?.schedule ?? null}
        onClose={() => setSheet(null)}
        onSave={async (data) => {
          const current = sheet?.schedule ?? null;
          try {
            await saveSchedule(current?.documentId ?? null, data);
            toast.success(
              `${current ? 'La collecte' : 'La nouvelle collecte'} « ${typeLabel(data.waste_type)} » est enregistrée. Elle apparaîtra sur le site à la prochaine mise en ligne.`,
            );
            setSheet(null);
          } catch (error) {
            toast.error(`La collecte n'a pas pu être enregistrée : ${errorText(error)}`);
          }
          await refreshWaste(client);
        }}
        onDelete={async () => {
          const current = sheet!.schedule!;
          try {
            await deleteSchedule(current.documentId);
            toast.success(`La collecte « ${typeLabel(current.waste_type)} » a été supprimée.`);
            setSheet(null);
          } catch (error) {
            toast.error(`La collecte n'a pas pu être supprimée : ${errorText(error)}`);
          }
          await refreshWaste(client);
        }}
      />
    </div>
  );
}

/** Notes affichées en tête de la page Collecte des déchets (Site.waste_notes) */
function SiteNotes() {
  const client = useQueryClient();
  const { data: user } = useQuery(sessionQuery);
  const siteId = user?.site?.documentId ?? '';
  const settings = useQuery({ ...siteSettingsQuery(siteId), enabled: !!siteId });
  const id = useId();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const saved = settings.data?.waste_notes ?? '';
  // Notes chargées (ou enregistrées) : le champ les reprend
  const [loaded, setLoaded] = useState<string | null | undefined>(undefined);
  if (settings.data && settings.data.waste_notes !== loaded) {
    setLoaded(settings.data.waste_notes);
    setText(settings.data.waste_notes ?? '');
  }
  const tooLong = text.length > 2000;

  return (
    <section aria-labelledby={`${id}-titre`} className="mt-6 rounded-xl border border-border bg-surface p-4 md:p-5">
      <h2 id={`${id}-titre`} className="text-[15px] font-semibold">
        <label htmlFor={`${id}-notes`}>Notes affichées sur le site</label>
      </h2>
      <p id={`${id}-aide`} className="mt-0.5 text-[13px] text-secondary">
        En tête de la page Collecte des déchets : consignes, horaires de la déchetterie…
      </p>
      <textarea
        id={`${id}-notes`}
        value={text}
        rows={3}
        disabled={!settings.isSuccess}
        aria-describedby={`${id}-aide${tooLong ? ` ${id}-erreur` : ''}`}
        aria-invalid={tooLong || undefined}
        onChange={(event) => setText(event.target.value)}
        className={cn(
          'mt-3 w-full resize-y rounded-lg border border-border-input bg-surface px-3 py-2.5 dark:bg-bg',
          tooLong && 'border-danger',
        )}
      />
      {tooLong && (
        <p id={`${id}-erreur`} className="mt-1 text-[13px] font-medium text-danger">
          Les notes ne doivent pas dépasser 2 000 caractères.
        </p>
      )}
      <div className="mt-3 flex justify-end">
        <Button
          variant="secondary"
          disabled={saving || tooLong || text.trim() === saved.trim()}
          onClick={async () => {
            setSaving(true);
            try {
              await saveSiteSettings(client, siteId, { waste_notes: text.trim() || null });
              toast.success('Notes enregistrées. Elles apparaîtront sur le site à la prochaine mise en ligne.');
            } catch (error) {
              toast.error(`Les notes n'ont pas pu être enregistrées : ${errorText(error)}`);
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving && <Loader2 aria-hidden="true" className="animate-spin" />}
          Enregistrer les notes
        </Button>
      </div>
    </section>
  );
}
