/**
 * Emplacement de la commune (#362) : pour la carte et la météo du site. On cherche une ville ou une
 * adresse (Base adresse nationale, lue par l'API Communeo) au lieu de saisir des coordonnées GPS.
 * Le champ du formulaire reste `coordinates` (« latitude, longitude ») ; seule l'équipe voit les
 * chiffres, dans un détail. La position affichée est nommée par le lieu choisi, par `knownLabels`
 * (centre de la commune trouvé par l'assistant) ou, à défaut, par la commune où elle se trouve.
 */
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { CircleAlert, Loader2, MapPin, Search } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { PlaceMatch } from '@communeo/core/client';
import { controlClass, Field, useFieldError } from '@/components/form';
import { Button } from '@/components/ui/button';
import { placeCommune, searchPlaces } from '@/lib/onboarding';
import { sessionQuery } from '@/lib/session';
import { cn } from '@/lib/utils';

/** « 46.7412, 3.7891 » (ou séparées par un espace, un point-virgule) → latitude et longitude */
export function parseCoordinates(text: string): { latitude: number; longitude: number } | null {
  const parts = text
    .trim()
    .split(/\s*[,;]\s*|\s+/)
    .filter(Boolean);
  if (parts.length !== 2) return null;
  const [latitude, longitude] = parts.map(Number) as [number, number];
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180)
    return null;
  return { latitude, longitude };
}

export const formatCoordinates = (latitude: number, longitude: number) => `${latitude}, ${longitude}`;

const KIND_LABELS: Record<PlaceMatch['kind'], string> = {
  commune: 'Commune',
  rue: 'Rue',
  adresse: 'Adresse',
  'lieu-dit': 'Lieu-dit',
};

export function LocationField({
  label = 'Emplacement sur la carte',
  badge,
  knownLabels,
}: {
  label?: string;
  badge?: ReactNode;
  /** Noms des positions déjà connues (« 46.79, 3.13 » → « Centre de Saint-Pierre-le-Moûtier ») */
  knownLabels?: Record<string, string>;
}) {
  const { setValue } = useFormContext<{ coordinates: string }>();
  const value = useWatch<{ coordinates: string }>({ name: 'coordinates' }) ?? '';
  const position = parseCoordinates(value);
  const error = useFieldError('coordinates');
  const { data: user } = useSuspenseQuery(sessionQuery);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<PlaceMatch[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [announce, setAnnounce] = useState('');

  const known = chosen[value] ?? knownLabels?.[value];
  const commune = useQuery({
    queryKey: ['place-commune', value],
    queryFn: () => placeCommune(position!.latitude, position!.longitude),
    enabled: !!position && !known,
    staleTime: Infinity,
    retry: false,
  });
  const where = commune.data
    ? `Dans la commune de ${commune.data.name}${commune.data.postalCode ? ` (${commune.data.postalCode})` : ''}`
    : 'Position enregistrée';

  // Recherche au fil de la frappe, après une courte pause, près de la position actuelle
  const q = query.trim();
  useEffect(() => {
    // Moins de 3 caractères : rien n'est cherché, la liste est masquée (voir le rendu)
    if (q.length < 3) return;
    const timer = setTimeout(() => {
      setSearching(true);
      searchPlaces(q, position)
        .then((found) => {
          setPlaces(found);
          setUnavailable(false);
        })
        .catch(() => {
          setPlaces(null);
          setUnavailable(true);
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
    // La position ne relance pas la recherche : seule la frappe compte
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const choose = (place: PlaceMatch) => {
    const coordinates = formatCoordinates(place.latitude, place.longitude);
    setChosen((current) => ({ ...current, [coordinates]: place.label }));
    setValue('coordinates', coordinates, { shouldDirty: true, shouldValidate: true });
    setQuery('');
    setPlaces(null);
    setAnnounce(`Emplacement retenu : ${place.label}`);
    // Le bouton choisi disparaît avec la liste : le focus revient au champ de recherche
    input.current?.focus();
  };

  return (
    <Field
      name="coordinates"
      label={label}
      badge={badge}
      error={error}
      help="Recherchez la commune, ou l'adresse de la mairie pour plus de précision : la carte et la météo du site s'y placent."
    >
      {(props) => (
        <div>
          <p
            className={cn(
              'mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2.5',
              position ? 'border-border bg-neutral-bg' : 'border-dashed border-border-input text-secondary',
            )}
          >
            <MapPin aria-hidden="true" className={cn('size-4 shrink-0', position && 'text-brand')} />
            <span className="min-w-0 flex-1">
              {position ? (
                <>
                  <span className="sr-only">Emplacement actuel : </span>
                  {known ?? (commune.isPending ? 'Recherche du lieu…' : where)}
                </>
              ) : (
                'Pas encore d’emplacement : la carte et la météo ne s’affichent pas.'
              )}
            </span>
            {position && (
              <Button
                type="button"
                variant="tertiary"
                size="sm"
                onClick={() => {
                  setValue('coordinates', '', { shouldDirty: true, shouldValidate: true });
                  setAnnounce('Emplacement retiré');
                  input.current?.focus();
                }}
              >
                Retirer<span className="sr-only"> l’emplacement</span>
              </Button>
            )}
          </p>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-secondary"
            />
            <input
              {...props}
              ref={input}
              type="search"
              autoComplete="off"
              value={query}
              placeholder={position ? 'Changer : ville ou adresse' : 'Ville ou adresse'}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && query) {
                  event.preventDefault();
                  setQuery('');
                }
              }}
              className={cn(controlClass, 'h-11 pl-9 md:h-10')}
            />
            {searching && (
              <Loader2 aria-hidden="true" className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
            )}
          </div>
          <p role="status" className="sr-only">
            {places && q.length >= 3
              ? `${places.length} lieu${places.length > 1 ? 'x' : ''} trouvé${places.length > 1 ? 's' : ''}`
              : announce}
          </p>
          {unavailable && q.length >= 3 && (
            <p className="mt-2 flex items-start gap-2 text-[13px] text-warning">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              La recherche d’adresses ne répond pas pour le moment : réessayez dans quelques instants.
            </p>
          )}
          {places && q.length >= 3 && (
            <ul
              aria-label="Lieux trouvés"
              className="mt-2 divide-y divide-border rounded-xl border border-border bg-surface dark:bg-sidebar"
            >
              {places.length === 0 ? (
                <li className="px-4 py-3 text-secondary">
                  Aucun lieu ne correspond. Essayez le nom de la commune, ou une adresse avec la commune.
                </li>
              ) : (
                places.map((place) => (
                  <li key={`${place.label}-${place.latitude}-${place.longitude}`}>
                    <button
                      type="button"
                      onClick={() => choose(place)}
                      className="flex min-h-12 w-full flex-wrap items-center justify-between gap-x-3 px-4 py-2 text-left hover:bg-surface-hover"
                    >
                      <span>
                        <span className="font-semibold">{place.label}</span>
                        {place.context && <span className="block text-[13px] text-secondary">{place.context}</span>}
                      </span>
                      <span className="rounded-full bg-neutral-bg px-2 py-0.5 text-[11px] font-semibold text-secondary">
                        {KIND_LABELS[place.kind]}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
          {position && user.municipality_role === 'super_admin' && (
            <details className="mt-2 text-[13px] text-secondary">
              <summary className="cursor-pointer">Coordonnées (équipe Communeo)</summary>
              <p className="mt-1">
                Latitude {position.latitude}, longitude {position.longitude}
              </p>
            </details>
          )}
        </div>
      )}
    </Field>
  );
}
