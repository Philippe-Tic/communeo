/**
 * Vidéo de test (5 s) : navigateur, caméra, curseur, saisie, légende, téléphone et carte de fin, sur de
 * vraies captures. Les scènes suivent les segments du script (et donc la voix, une fois calée).
 */
import type { ReactNode } from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import alerte from '../../../public/captures/test/alerte-nouvelle.json';
import mobile from '../../../public/captures/test/site-mobile.json';
import { BARRE, BrowserFrame } from '../../composants/BrowserFrame';
import { Callout } from '../../composants/Callout';
import { Camera } from '../../composants/Camera';
import { Cursor } from '../../composants/Cursor';
import { EndCard } from '../../composants/EndCard';
import { Fond } from '../../composants/Fond';
import { BORD, ETAT, PhoneFrame } from '../../composants/PhoneFrame';
import { Typing } from '../../composants/Typing';
import { VoixOff } from '../../composants/VoixOff';
import { autour, centre, decale, element, type Capture, type Rect } from '../../lib/geometrie';
import { chronologie, type Timings } from '../../lib/script';
import { script } from './script';
import timings from './timings.json';

const ADMIN = alerte as Capture;
const MOBILE = mobile as Capture;

/** Fondu enchaîné : chaque scène commence FONDU images avant la fin de la précédente et apparaît par-dessus */
const FONDU = 10;

function Entree({ children }: { children: ReactNode }) {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: interpolate(frame, [0, FONDU], [0, 1], { extrapolateRight: 'clamp' }) }}>{children}</AbsoluteFill>;
}

function SceneAdmin() {
  // Repère du contenu : la capture sous la barre du navigateur
  const sousBarre = (r: Rect) => decale(r, 0, BARRE);
  const titre = element(ADMIN, 'titre');
  const attention = element(ADMIN, 'attention');
  // Le formulaire, du titre de l'écran au niveau de gravité ; le cadrage reste sous la barre de l'admin
  // (80 px), pour qu'aucun bouton n'apparaisse coupé au bord
  const formulaire: Rect = { x: titre.x - 40, y: titre.y - 130, width: titre.width + 80, height: attention.y + attention.height - titre.y + 150 };
  const sousLaBarre: Rect = { x: 0, y: 80, width: ADMIN.largeur, height: ADMIN.hauteur - 80 };
  return (
    <AbsoluteFill>
      <Fond />
      <Camera
        largeur={ADMIN.largeur}
        hauteur={ADMIN.hauteur + BARRE}
        etapes={[{ de: 8, a: 34, cadre: sousBarre(formulaire), bornes: sousBarre(sousLaBarre) }]}
        superposition={(versEcran, echelle) => (
          <Cursor
            versEcran={versEcran}
            echelle={echelle}
            points={[
              { image: 0, x: 1180, y: 780 },
              { image: 26, ...centre(sousBarre(titre)), clic: true },
              { image: 72, ...centre(sousBarre(attention)), clic: true },
            ]}
          />
        )}
      >
        <BrowserFrame capture={ADMIN}>
          <Typing cadre={titre} de={30} texte="Coupure d’eau mardi" />
        </BrowserFrame>
      </Camera>
      <Callout texte="Publier une alerte en direct" de={18} position="bas-droite" />
    </AbsoluteFill>
  );
}

function SceneTelephone() {
  const bandeau = element(MOBILE, 'bandeau');
  const largeur = MOBILE.largeur + 2 * BORD;
  const hauteur = 780 + ETAT + 2 * BORD;
  return (
    <Entree>
      <Fond />
      <Camera largeur={largeur} hauteur={hauteur} marge={70} etapes={[{ de: 6, a: 30, cadre: autour(decale(bandeau, BORD, BORD + ETAT), 140) }]}>
        <PhoneFrame capture={MOBILE} />
      </Camera>
      <Callout texte="Visible chez les habitants" de={4} position="bas-droite" />
    </Entree>
  );
}

export function Test() {
  const segments = chronologie(script, timings as Timings);
  const [admin, telephone, fin] = segments;
  return (
    <AbsoluteFill>
      <Fond />
      <Sequence from={admin!.de} durationInFrames={admin!.a - admin!.de}>
        <SceneAdmin />
      </Sequence>
      <Sequence from={telephone!.de - FONDU} durationInFrames={telephone!.a - telephone!.de + FONDU}>
        <SceneTelephone />
      </Sequence>
      <Sequence from={fin!.de - FONDU}>
        <Entree>
          <EndCard />
        </Entree>
      </Sequence>
      <VoixOff timings={timings as Timings} segments={segments} />
    </AbsoluteFill>
  );
}
