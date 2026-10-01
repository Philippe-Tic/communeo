/**
 * Téléphone autour d'une capture mobile (390 px de large), dans le style du téléphone du site. Les
 * enfants sont placés dans le repère de la capture, sous la barre d'état.
 */
import type { ReactNode } from 'react';
import { Img, staticFile } from 'remotion';
import { C, POLICES } from '../charte';
import type { Capture } from '../lib/geometrie';

export const BORD = 14;
export const ETAT = 50;

/** Hauteur d'écran visible : les captures mobiles sont prises à 844 px de haut */
export function PhoneFrame({ capture, hauteur = 780, defilement = 0, children }: { capture: Capture; hauteur?: number; defilement?: number; children?: ReactNode }) {
  const largeur = capture.largeur;
  return (
    <div
      style={{
        width: largeur + 2 * BORD,
        height: hauteur + ETAT + 2 * BORD,
        padding: BORD,
        borderRadius: 64,
        background: C.encre,
        boxShadow: '0 60px 110px -50px rgba(14, 64, 51, 0.55), 0 3px 10px rgba(28, 27, 24, 0.2)',
      }}
    >
      <div style={{ position: 'relative', width: largeur, height: hauteur + ETAT, borderRadius: 50, overflow: 'hidden', background: C.blanc }}>
        <div
          style={{
            height: ETAT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 34px',
            fontFamily: POLICES.sans,
            fontWeight: 600,
            fontSize: 17,
            color: C.encre,
          }}
        >
          <span>9:41</span>
          <span style={{ width: 110, height: 30, borderRadius: 16, background: C.encre }} />
          <span style={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
            {[6, 9, 12].map((h) => (
              <span key={h} style={{ width: 4, height: h, borderRadius: 1, background: C.encre }} />
            ))}
          </span>
        </div>
        <div style={{ position: 'absolute', left: 0, top: ETAT, width: largeur, height: hauteur, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: largeur, height: capture.hauteur, transform: `translateY(${-defilement}px)` }}>
            <Img src={staticFile(capture.image)} style={{ display: 'block', width: largeur, height: capture.hauteur }} />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
