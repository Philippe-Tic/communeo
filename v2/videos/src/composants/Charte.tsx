/**
 * Enveloppe de chaque composition : attend que les polices du site (DM Sans, DM Serif Display) soient
 * chargées avant de rendre la moindre image.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { continueRender, delayRender } from 'remotion';
import '../charte';

export function Charte({ children }: { children: ReactNode }) {
  const [attente] = useState(() => delayRender('Polices du site'));
  useEffect(() => {
    Promise.all([
      document.fonts.load('400 48px "DM Serif Display"'),
      document.fonts.load('400 32px "DM Sans Variable"'),
      document.fonts.load('600 32px "DM Sans Variable"'),
    ])
      .then(() => document.fonts.ready)
      .finally(() => continueRender(attente));
  }, [attente]);
  return <>{children}</>;
}
