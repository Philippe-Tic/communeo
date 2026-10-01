/**
 * V3. Un contenu, quatre thèmes (15 s).
 *
 * Trois scènes, une par segment du script (heures calées sur la voix, sur les temps de la musique),
 * avec le montage commun (composants/Montage.tsx) : l'écran Apparence, son aperçu qui passe d'un
 * thème à l'autre, puis les quatre accueils côte à côte. Repères en secondes à
 * vitesse posée (`s(…)`), que le rythme resserre.
 */
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { BARRE, BrowserFrame } from '../../composants/BrowserFrame';
import { Callout } from '../../composants/Callout';
import { Etat } from '../../composants/Etat';
import { Fond } from '../../composants/Fond';
import { nav, Navigateur, rythme, Scenes } from '../../composants/Montage';
import { C, POLICES } from '../../charte';
import { centre, element, type Capture, type Rect } from '../../lib/geometrie';
import type { Timings } from '../../lib/script';
import { script } from './script';
import timings from './timings.json';

import apparence from '../../../public/captures/v3-themes/apparence.json';
import apercuInstitutionnel from '../../../public/captures/v3-themes/apercu-institutionnel.json';
import apercuModerne from '../../../public/captures/v3-themes/apercu-moderne.json';
import apercuJournal from '../../../public/captures/v3-themes/apercu-journal.json';
import apercuBourg from '../../../public/captures/v3-themes/apercu-bourg.json';
import siteInstitutionnel from '../../../public/captures/v3-themes/site-institutionnel.json';
import siteModerne from '../../../public/captures/v3-themes/site-moderne.json';
import siteJournal from '../../../public/captures/v3-themes/site-journal.json';
import siteBourg from '../../../public/captures/v3-themes/site-bourg.json';

const C_ = <T,>(capture: T) => capture as unknown as Capture;

const { s, vers, au } = rythme();

/**
 * Le titre et les deux premières vignettes (Institutionnel, actif, et Moderne). Avec la marge de la
 * caméra, la vue commence juste après le menu de gauche (232 px) : aucun libellé coupé au bord.
 */
const VIGNETTES: Rect = nav({ x: 292, y: 60, width: 1091, height: 564 });
const SANS_MENU: Rect = { x: 236, y: 0, width: 1204, height: 900 + BARRE };
/** L'aperçu presque plein cadre : barres en haut, la page du site en dessous (le bas de la page sort du cadre) */
const APERCU: Rect = { x: 60, y: 0, width: 1320, height: 742 };
const TOUT: Rect = { x: 0, y: 0, width: 1440, height: 900 + BARRE };

// ---------------------------------------------------------------------------------------------------
// 1. L'écran Apparence : les quatre thèmes, « Prévisualiser »

function Apparence() {
  const ecran = C_(apparence);
  return (
    <Navigateur
      capture={ecran}
      etapes={[vers(0.5, VIGNETTES, SANS_MENU)]}
      curseur={[au(0, { x: 1150, y: 860 }), au(2.6, centre(nav(element(ecran, 'previsualiser'))), true)]}
    />
  );
}

// ---------------------------------------------------------------------------------------------------
// 2. L'aperçu : Institutionnel, puis Moderne, Journal et Bourg

function Apercu() {
  const institutionnel = C_(apercuInstitutionnel);
  // Repères des clics (secondes depuis le début de la scène, glissade d'entrée comprise)
  const T = { moderne: 2.4, journal: 4.3, bourg: 6.2 };
  const bouton = (nom: string) => centre(nav(element(institutionnel, nom)));
  // Après chaque clic, le pointeur descend un peu : le bouton choisi se lit
  const apres = (nom: string) => ({ x: bouton(nom).x + 30, y: bouton(nom).y + 90 });
  return (
    <Navigateur
      capture={institutionnel}
      // Caméra immobile : seule la mise en page change
      etapes={[{ de: -1, a: 0, cadre: APERCU, bornes: TOUT }]}
      curseur={[
        au(0, { x: 900, y: 640 }),
        au(1.6, apres('moderne')),
        au(T.moderne, bouton('moderne'), true),
        au(T.moderne + 0.5, apres('moderne')),
        au(T.journal, bouton('journal'), true),
        au(T.journal + 0.5, apres('journal')),
        au(T.bourg, bouton('bourg'), true),
        au(T.bourg + 0.5, apres('bourg')),
      ]}
    >
      <Etat capture={C_(apercuModerne)} de={s(T.moderne + 0.15)} />
      <Etat capture={C_(apercuJournal)} de={s(T.journal + 0.15)} />
      <Etat capture={C_(apercuBourg)} de={s(T.bourg + 0.15)} />
    </Navigateur>
  );
}

// ---------------------------------------------------------------------------------------------------
// 3. Les quatre accueils côte à côte

const SITES = [
  { nom: 'Institutionnel', capture: C_(siteInstitutionnel) },
  { nom: 'Moderne', capture: C_(siteModerne) },
  { nom: 'Journal', capture: C_(siteJournal) },
  { nom: 'Bourg', capture: C_(siteBourg) },
];

function QuatreThemes() {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  // Chaque fenêtre montre l'accueil de l'en-tête aux actualités et à l'agenda
  const VUE = 2800;
  const ECART = 36;
  const largeurColonne = (width - 2 * 70 - 3 * ECART) / 4;
  const k = largeurColonne / 1440;
  const haut = 96;
  return (
    <AbsoluteFill>
      <Fond />
      {SITES.map(({ nom, capture }, i) => {
        const arrivee = spring({ frame: frame - 3 * i, fps, config: { damping: 17, stiffness: 130 } });
        return (
          <div key={nom} style={{ position: 'absolute', left: 70 + i * (largeurColonne + ECART), top: haut, width: largeurColonne, opacity: Math.min(1, arrivee * 1.5), transform: `translateY(${(1 - arrivee) * 140}px)` }}>
            <div style={{ position: 'absolute', top: -52, left: 4, fontFamily: POLICES.sans, fontWeight: 600, fontSize: 30, color: C.sapin }}>{nom}</div>
            <div style={{ width: 1440, transform: `scale(${k})`, transformOrigin: 'top left' }}>
              <BrowserFrame capture={{ ...capture, vue: Math.min(VUE, capture.hauteur) }} />
            </div>
          </div>
        );
      })}
      <Callout texte="Mêmes actualités, mêmes horaires, même logo" de={s(1.4)} position={{ x: 70, y: haut + (VUE + BARRE) * k + 26 }} />
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------------------------------

const SCENES = [Apparence, Apercu, QuatreThemes];

export function V3Themes() {
  return <Scenes script={script} timings={timings as Timings} scenes={SCENES} />;
}
