/**
 * Fenêtre de navigateur sobre autour d'une capture : barre à pastilles et adresse lisible. Les enfants
 * sont placés dans le repère de la capture (pixels CSS), sous la barre, et défilent avec la page.
 * Capture pleine page : la fenêtre montre `capture.vue` pixels de haut, à partir de `defilement`.
 */
import type { ReactNode } from 'react';
import { Img, staticFile } from 'remotion';
import { C, POLICES } from '../charte';
import type { Capture } from '../lib/geometrie';

/** Hauteur de la barre du navigateur, en pixels CSS de la capture */
export const BARRE = 56;

export function BrowserFrame({ capture, url, defilement = 0, children }: { capture: Capture; url?: string; defilement?: number; children?: ReactNode }) {
  const vue = capture.vue ?? capture.hauteur;
  return (
    <div
      style={{
        width: capture.largeur,
        height: vue + BARRE,
        borderRadius: 18,
        overflow: 'hidden',
        background: C.blanc,
        border: `1px solid ${C.grege}`,
        boxShadow: '0 50px 100px -50px rgba(14, 64, 51, 0.5), 0 2px 8px rgba(28, 27, 24, 0.06)',
        position: 'relative',
      }}
    >
      <div style={{ height: BARRE, display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px', background: C.papierClair, borderBottom: `1px solid ${C.grege}` }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 13, height: 13, borderRadius: '50%', background: C.grege }} />
        ))}
        <div
          style={{
            marginLeft: 22,
            flex: '0 1 560px',
            height: 34,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 16px',
            borderRadius: 17,
            background: C.blanc,
            border: `1px solid ${C.grege}`,
            fontFamily: POLICES.sans,
            fontSize: 19,
            color: C.encreDouce,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          {url ?? capture.url}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, top: BARRE, width: capture.largeur, height: vue, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: capture.largeur, height: capture.hauteur, transform: `translateY(${-defilement}px)` }}>
          <Img src={staticFile(capture.image)} style={{ display: 'block', width: capture.largeur, height: capture.hauteur }} />
          {children}
        </div>
      </div>
    </div>
  );
}
