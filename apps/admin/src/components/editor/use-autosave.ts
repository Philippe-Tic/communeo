/**
 * Enregistrement automatique du brouillon : au plus toutes les ~5 s tant qu'il y a des modifications,
 * immédiatement sur demande (`flush`, avant de quitter la page ou de publier).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { sessionEvents } from '@/lib/api';

export type SaveState = { status: 'idle' } | { status: 'saving' } | { status: 'saved'; at: Date } | { status: 'error'; message: string };

export function useAutosave<T>({ values, save, delay = 5000, enabled = true }: { values: T; save: (values: T) => Promise<void>; delay?: number; enabled?: boolean }) {
  const [state, setState] = useState<SaveState>({ status: 'idle' });
  const saved = useRef(JSON.stringify(values));
  const latest = useRef(values);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = useRef<Promise<boolean> | null>(null);
  const saveRef = useRef(save);

  useEffect(() => {
    latest.current = values;
    saveRef.current = save;
  });

  const isDirty = () => JSON.stringify(latest.current) !== saved.current;

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (running.current) await running.current;
    if (!isDirty()) return true;
    const snapshot = latest.current;
    const serialized = JSON.stringify(snapshot);
    setState({ status: 'saving' });
    running.current = saveRef
      .current(snapshot)
      .then(() => {
        saved.current = serialized;
        setState({ status: 'saved', at: new Date() });
        return true;
      })
      .catch((error: unknown) => {
        setState({ status: 'error', message: error instanceof Error ? error.message : "L'enregistrement a échoué." });
        return false;
      })
      .finally(() => {
        running.current = null;
      });
    return running.current;
  }, []);

  // Une modification programme un enregistrement (sans repousser celui déjà prévu : au plus toutes les ~5 s)
  const serialized = JSON.stringify(values);
  useEffect(() => {
    if (!enabled || serialized === saved.current || timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      void flush();
    }, delay);
  }, [serialized, enabled, delay, flush]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Reconnexion après une session expirée : le brouillon resté en échec est enregistré aussitôt
  useEffect(
    () =>
      sessionEvents.subscribe((event) => {
        if (event === 'restored' && enabled && isDirty()) void flush();
      }),
    [enabled, flush],
  );

  /** Après un enregistrement fait ailleurs (publication, programmation) : ces valeurs sont à jour */
  const markSaved = useCallback((value: T) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    saved.current = JSON.stringify(value);
    setState({ status: 'saved', at: new Date() });
  }, []);

  return { state, flush, isDirty, markSaved };
}
