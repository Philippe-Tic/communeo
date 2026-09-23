/**
 * Panneau de preview (handoff 6.3, #136) : la vraie page rendue par le serveur de preview, dans le thème
 * de la commune, à la largeur choisie (mobile 390, tablette 768, bureau 1280) réduite pour tenir dans le
 * panneau. Rechargée après chaque enregistrement ; la preview reste en clair, même en mode sombre.
 * Écrans de réglages (`settings`) : les réglages non enregistrés partent au serveur de preview par un
 * formulaire POST dont la cible est l'iframe (voir apps/renderer/src/lib/preview.ts).
 */
import { Dialog } from 'radix-ui';
import type React from 'react';
import { Maximize2, Monitor, PanelRightClose, RotateCw, Smartphone, Tablet, X, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { PREVIEW_FORM } from '@communeo/core';
import { Button } from '@/components/ui/button';
import { withVersion } from '@/lib/preview';
import { cn } from '@/lib/utils';

export type Device = 'mobile' | 'tablet' | 'desktop';

const DEVICES: Array<{ id: Device; label: string; width: number; icon: LucideIcon }> = [
  { id: 'mobile', label: 'Mobile', width: 390, icon: Smartphone },
  { id: 'tablet', label: 'Tablette', width: 768, icon: Tablet },
  { id: 'desktop', label: 'Bureau', width: 1280, icon: Monitor },
];

export interface PreviewState {
  /** Lien signé vers la page, ou raison de son absence */
  url?: string;
  unavailable?: string;
  version: number;
  title: string;
  themeName: string;
  /** Réglages non enregistrés (JSON) à montrer : envoyés en POST avec le jeton */
  settings?: string;
  /** Légende de la barre d'outils (par défaut « Aperçu du brouillon — thème … ») */
  caption?: string;
}

/** Choix de la largeur : groupe de boutons radio, flèches pour changer */
function DevicePicker({ device, onChange }: { device: Device; onChange: (device: Device) => void }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + DEVICES.length) % DEVICES.length;
    onChange(DEVICES[next]!.id);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label="Largeur de l'aperçu" className="flex rounded-lg border border-border-input">
      {DEVICES.map((item, index) => {
        const Icon = item.icon;
        const checked = item.id === device;
        return (
          <button
            key={item.id}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={`${item.label} (${item.width} px)`}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn('grid h-[30px] w-9 place-items-center first:rounded-l-[7px] last:rounded-r-[7px]', checked ? 'bg-brand-button text-on-brand' : 'text-text hover:bg-surface-hover')}
          >
            <Icon aria-hidden="true" className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

/** Iframe à la largeur réelle de l'appareil, réduite pour tenir dans son conteneur */
function ScaledFrame({ state, device, fit }: { state: PreviewState; device: Device; fit: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => entry && setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  const deviceWidth = DEVICES.find((item) => item.id === device)!.width;
  const phone = device === 'mobile';
  const available = phone ? Math.min(size.width, 320) - 12 : size.width;
  const scale = fit && available > 0 ? Math.min(1, available / deviceWidth) : 1;
  const frameHeight = scale > 0 ? (size.height - (phone ? 12 : 0)) / scale : size.height;

  return (
    <div ref={container} className="relative flex min-h-0 flex-1 justify-center overflow-hidden">
      {state.url ? (
        <div
          className={cn('overflow-hidden bg-white', phone && 'rounded-[18px] border-[6px] border-[#1C1B18]')}
          style={{ width: deviceWidth * scale + (phone ? 12 : 0), height: '100%' }}
        >
          {state.settings === undefined ? (
            <iframe
              key={device}
              title={`Aperçu de « ${state.title} »`}
              src={withVersion(state.url, state.version)}
              className="origin-top-left border-0 bg-white"
              style={{ width: deviceWidth, height: Math.max(frameHeight, 0), transform: `scale(${scale})` }}
            />
          ) : (
            <SettingsFrame key={device} url={state.url} settings={state.settings} version={state.version} title={state.title} style={{ width: deviceWidth, height: Math.max(frameHeight, 0), transform: `scale(${scale})` }} />
          )}
        </div>
      ) : (
        <p className="m-auto max-w-72 text-center text-[13px] text-secondary">{state.unavailable ?? "Chargement de l'aperçu…"}</p>
      )}
    </div>
  );
}

/** Iframe remplie par un POST : jeton (tiré du lien signé) et réglages, renvoyés à chaque changement */
function SettingsFrame({ url, settings, version, title, style }: { url: string; settings: string; version: number; title: string; style: React.CSSProperties }) {
  const name = `apercu-${useId().replace(/:/g, '')}`;
  const form = useRef<HTMLFormElement>(null);
  const target = new URL(url);
  const token = target.searchParams.get('token') ?? '';
  target.searchParams.delete('token');
  useEffect(() => {
    form.current?.submit();
  }, [settings, version]);
  return (
    <>
      <form ref={form} method="post" action={target.toString()} target={name} hidden>
        <input type="hidden" name={PREVIEW_FORM.token} value={token} />
        <input type="hidden" name={PREVIEW_FORM.settings} value={settings} />
      </form>
      <iframe name={name} title={`Aperçu de « ${title} »`} className="origin-top-left border-0 bg-white" style={style} />
    </>
  );
}

function PreviewToolbar({
  state,
  device,
  onDevice,
  onReload,
  onFullscreen,
  onHide,
}: {
  state: PreviewState;
  device: Device;
  onDevice: (device: Device) => void;
  onReload: () => void;
  onFullscreen?: () => void;
  onHide?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
      <DevicePicker device={device} onChange={onDevice} />
      <p className="min-w-0 flex-1 truncate text-[13px] text-secondary">{state.caption ?? `Aperçu du brouillon — thème ${state.themeName}`}</p>
      <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Recharger l'aperçu" onClick={onReload} disabled={!state.url}>
        <RotateCw aria-hidden="true" />
      </Button>
      {onFullscreen && (
        <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Aperçu plein écran" onClick={onFullscreen} disabled={!state.url}>
          <Maximize2 aria-hidden="true" />
        </Button>
      )}
      {onHide && (
        <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Masquer l'aperçu" onClick={onHide}>
          <PanelRightClose aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

/** Contenu du panneau : barre d'outils et page (utilisé dans la colonne, le tiroir et le plein écran) */
export function PreviewView({
  state,
  onReload,
  onFullscreen,
  onHide,
  fit = true,
}: {
  state: PreviewState;
  onReload: () => void;
  onFullscreen?: () => void;
  onHide?: () => void;
  fit?: boolean;
}) {
  const [device, setDevice] = useState<Device>(() => (localStorageGet('communeo.preview.device') as Device | null) ?? 'desktop');
  const choose = (value: Device) => {
    setDevice(value);
    localStorageSet('communeo.preview.device', value);
  };
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PreviewToolbar state={state} device={device} onDevice={choose} onReload={onReload} onFullscreen={onFullscreen} onHide={onHide} />
      <div className="flex min-h-0 flex-1 bg-border-row p-4 dark:bg-sidebar">
        <ScaledFrame state={state} device={device} fit={fit} />
      </div>
    </div>
  );
}

/** Plein écran : même aperçu sur toute la fenêtre */
export function PreviewFullscreen({ open, onOpenChange, state, onReload }: { open: boolean; onOpenChange: (open: boolean) => void; state: PreviewState; onReload: () => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Content className="fixed inset-0 z-50 flex flex-col bg-[#1C1B18]">
          <div className="flex items-center justify-between bg-surface px-4 py-2 dark:bg-sidebar">
            <Dialog.Title className="font-semibold">Aperçu plein écran — {state.title}</Dialog.Title>
            <Dialog.Description className="sr-only">Aperçu du brouillon, tel qu'il sera publié.</Dialog.Description>
            <Dialog.Close asChild>
              <Button type="button" variant="secondary" size="sm">
                <X aria-hidden="true" />
                Fermer l'aperçu
              </Button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 bg-surface dark:bg-sidebar">
            <PreviewView state={state} onReload={onReload} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Tiroir superposé (sous 1280 px, variante 1c) */
export function PreviewDrawer({ open, onOpenChange, state, onReload, onFullscreen }: { open: boolean; onOpenChange: (open: boolean) => void; state: PreviewState; onReload: () => void; onFullscreen: () => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[640px] flex-col border-l border-border bg-surface shadow-dialog dark:border-border-dialog dark:bg-sidebar">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <Dialog.Title className="font-semibold">Aperçu</Dialog.Title>
            <Dialog.Description className="sr-only">Aperçu du brouillon, tel qu'il sera publié.</Dialog.Description>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Fermer l'aperçu">
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1">
            <PreviewView state={state} onReload={onReload} onFullscreen={onFullscreen} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Séparateur redimensionnable (souris et clavier : flèches ± 24 px, Début / Fin) */
export function ResizeHandle({ width, min, max, onChange }: { width: number; min: number; max: number; onChange: (width: number) => void }) {
  const start = useRef<{ x: number; width: number } | null>(null);
  const clamp = (value: number) => Math.min(max, Math.max(min, value));
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Largeur de l'aperçu"
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onKeyDown={(event) => {
        const delta = event.key === 'ArrowLeft' ? 24 : event.key === 'ArrowRight' ? -24 : 0;
        if (delta) {
          event.preventDefault();
          onChange(clamp(width + delta));
        } else if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault();
          onChange(event.key === 'Home' ? max : min);
        }
      }}
      onPointerDown={(event) => {
        start.current = { x: event.clientX, width };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (start.current) onChange(clamp(start.current.width + start.current.x - event.clientX));
      }}
      onPointerUp={() => {
        start.current = null;
      }}
      className="group relative w-1.5 shrink-0 cursor-col-resize bg-border hover:bg-brand focus-visible:bg-brand"
    >
      <span aria-hidden="true" className="absolute top-1/2 left-1/2 h-8 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-border-input group-hover:bg-white" />
    </div>
  );
}

export function localStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function localStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* préférence non mémorisée */
  }
}
