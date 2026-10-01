/**
 * V2. Une alerte, de l'administration au téléphone de l'habitant (20 s).
 *
 * Un seul plan : l'écran partagé, l'administration à gauche, le téléphone d'un habitant à droite. Les
 * segments du script (calés sur la voix et sur les temps de la musique) rythment la caméra : un
 * mouvement franc au début de chaque segment, jamais pendant un changement d'écran. Les repères sont en
 * secondes depuis le début de leur segment (`a(segment, secondes)`).
 */
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { BARRE, BrowserFrame } from '../../composants/BrowserFrame';
import { Callout } from '../../composants/Callout';
import { Camera, versEcranPour, type EtapeCamera } from '../../composants/Camera';
import { Chronometre } from '../../composants/Chronometre';
import { Cursor, type PointCurseur } from '../../composants/Cursor';
import { Etat, Zones } from '../../composants/Etat';
import { Fond } from '../../composants/Fond';
import { nav } from '../../composants/Montage';
import { Musique } from '../../composants/Musique';
import { BORD, ETAT, PhoneFrame } from '../../composants/PhoneFrame';
import { finDuChargement, Rechargement } from '../../composants/Rechargement';
import { TypingCaptures } from '../../composants/Typing';
import { VoixOff } from '../../composants/VoixOff';
import { FPS } from '../../lib/format';
import { centre, element, type Capture, type Rect } from '../../lib/geometrie';
import { chronologie, type Timings } from '../../lib/script';
import { script } from './script';
import timings from './timings.json';

import alerteVide from '../../../public/captures/v2-alerte/alerte-vide.json';
import alerteTitre from '../../../public/captures/v2-alerte/alerte-titre.json';
import alerteAttention from '../../../public/captures/v2-alerte/alerte-attention.json';
import alerteMessage from '../../../public/captures/v2-alerte/alerte-message.json';
import alerteFin from '../../../public/captures/v2-alerte/alerte-fin.json';
import alerteApercu from '../../../public/captures/v2-alerte/alerte-apercu.json';
import alertePubliee from '../../../public/captures/v2-alerte/alerte-publiee.json';
import alertesListe from '../../../public/captures/v2-alerte/alertes-liste.json';
import siteSansAlerte from '../../../public/captures/v2-alerte/site-sans-alerte.json';
import siteAvecAlerte from '../../../public/captures/v2-alerte/site-avec-alerte.json';

const C = <T,>(capture: T) => capture as unknown as Capture;

const SEGMENTS = chronologie(script, timings as Timings);
/** Image à `secondes` après le début du segment `i` */
const a = (i: number, secondes: number) => SEGMENTS[i]!.de + Math.round(secondes * FPS);
const vers = (de: number, duree: number, cadre: Rect | null, bornes?: Rect): EtapeCamera => ({ de, a: de + Math.round(duree * FPS), cadre, bornes });

// ---------------------------------------------------------------------------------------------------
// Repères (secondes depuis le début du segment)

const T = {
  // 0. L'écran partagé, puis le titre
  zoomFormulaire: a(0, 1.1),
  clicTitre: a(0, 2.0),
  titre: a(0, 2.2),
  // 1. Sévérité, message, fin, aperçu, publication
  clicAttention: a(1, 0.2),
  descente: a(1, 0.7),
  clicMessage: a(1, 1.6),
  message: a(1, 1.8),
  clicFin: a(1, 2.7),
  clicHeure: a(1, 3.2),
  // La page défile jusqu'au bouton, caméra immobile ; puis on recule sur l'aperçu
  defilement: a(1, 3.7),
  clicApercu: a(1, 4.4),
  recul: a(1, 4.9),
  clicPublier: a(1, 6.1),
  // 2. Publiée ; le téléphone recharge la page, le bandeau apparaît ; gros plan, puis l'écran partagé
  versTelephone: a(2, 0.4),
  rechargement: a(2, 1.6),
  grosPlan: a(2, 2.5),
  // (l'administration, hors champ, a fermé sa notification)
  liste: a(2, 3.0),
  ecranPartage: a(2, 4.6),
  // 3. L'alerte en ligne dans l'administration, son retrait automatique : la légende
  versListe: a(3, 0.1),
  legende: a(3, 1.0),
};
const DUREE_RECHARGEMENT = 16;
const BANDEAU_VISIBLE = T.rechargement + finDuChargement(DUREE_RECHARGEMENT);
/** Changement d'écran de l'administration : juste après chaque clic */
const APERCU = T.clicApercu + 5;
const PUBLIEE = T.clicPublier + 6;
const FONDU_ECRAN = 4;

// ---------------------------------------------------------------------------------------------------
// Géométrie : l'administration (navigateur) à gauche, le téléphone à droite, dans un même contenu

const vide = C(alerteVide);
const telephoneSans = C(siteSansAlerte);
const telephoneAvec = C(siteAvecAlerte);
const VUE = vide.vue ?? 900;
const HAUTEUR_NAVIGATEUR = VUE + BARRE;
const ECART = 90;
const HAUTEUR_ECRAN_TEL = 780;
const LARGEUR_TEL = telephoneSans.largeur + 2 * BORD;
const HAUTEUR_TEL = HAUTEUR_ECRAN_TEL + ETAT + 2 * BORD;
const X_TEL = vide.largeur + ECART;
const Y_TEL = (HAUTEUR_NAVIGATEUR - HAUTEUR_TEL) / 2;
const LARGEUR = X_TEL + LARGEUR_TEL;
const HAUTEUR = HAUTEUR_NAVIGATEUR;
const MARGE = 70;

/** Le bouton « Voir l'aperçu », sous la fenêtre : la page défile jusqu'à lui */
const DEFILEMENT = element(vide, 'apercu').y + element(vide, 'apercu').height + 60 - VUE;
/** Zone de saisie d'un champ : sans sa bordure, sur la largeur du texte */
const dans = (r: Rect, largeur: number): Rect => ({ x: r.x + 4, y: r.y + 4, width: largeur, height: r.height - 8 });
const surTelephone = (r: Rect): Rect => ({ ...r, x: r.x + X_TEL + BORD, y: r.y + Y_TEL + BORD + ETAT });

/** Le titre et la sévérité */
const FORMULAIRE_HAUT: Rect = { x: 470, y: nav(element(vide, 'titre')).y - 60, width: 740, height: 230 };
/** Le message, la fin et son heure */
const FORMULAIRE_BAS: Rect = { x: 470, y: nav(element(vide, 'message')).y - 30, width: 740, height: 320 };
/**
 * Le haut du téléphone (l'en-tête du site, où le bandeau va apparaître) et, à sa droite, le fond : le
 * cadre s'arrête dans l'écart entre les deux écrans, l'administration n'apparaît pas coupée au bord
 */
const HAUT_TELEPHONE: Rect = { x: X_TEL - 20, y: Y_TEL - 10, width: 1040, height: 520 };
/** Gros plan sur le bandeau ; la vue ne remonte pas sur l'administration (jamais d'écran coupé au bord) */
const bandeau = surTelephone(element(telephoneAvec, 'bandeau'));
const BANDEAU: Rect = { x: bandeau.x - 40, y: bandeau.y - 90, width: bandeau.width + 80, height: bandeau.height + 180 };
const A_DROITE_DE_L_ADMIN: Rect = { x: X_TEL - 60, y: -1000, width: 3000, height: 3000 };
/**
 * L'alerte en ligne dans la liste de l'administration, et sous elle la place de la légende. Cadre calculé
 * pour montrer la carte entière sans la barre latérale (coupée au bord sinon) : vue de 1 008 px de large
 * à partir du bord de la barre latérale.
 */
const liste = C(alertesListe);
const carte = nav(element(liste, 'carte'));
const BORD_BARRE_LATERALE = carte.x - 32;
const SOUS_LA_BARRE_LATERALE: Rect = { x: BORD_BARRE_LATERALE, y: BARRE, width: liste.largeur - BORD_BARRE_LATERALE, height: VUE };
const LISTE: Rect = { x: carte.x + carte.width / 2 - 467, y: carte.y - 40, width: 934, height: 400 };
const POSITION_LEGENDE = versEcranPour(LISTE, { largeur: LARGEUR, hauteur: HAUTEUR }, MARGE, SOUS_LA_BARRE_LATERALE)({ x: carte.x, y: carte.y + carte.height + 56 });

// ---------------------------------------------------------------------------------------------------

/** La page de l'administration défile (formulaire), puis revient en haut sur l'aperçu */
function defilementA(frame: number) {
  // (le formulaire reste défilé sous le fondu de l'aperçu, puis la page revient en haut, cachée)
  if (frame >= APERCU + FONDU_ECRAN) return 0;
  return interpolate(frame, [T.defilement, T.defilement + Math.round(0.45 * FPS)], [0, DEFILEMENT], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.45, 0, 0.2, 1),
  });
}

/** Un autre écran de l'administration, par-dessus le formulaire, en fondu court */
function Ecran({ capture, de }: { capture: Capture; de: number }) {
  const frame = useCurrentFrame();
  if (frame < de) return null;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, opacity: interpolate(frame, [de, de + FONDU_ECRAN], [0, 1], { extrapolateRight: 'clamp' }) }}>
      <BrowserFrame capture={capture} />
    </div>
  );
}

function Administration() {
  const frame = useCurrentFrame();
  const titre = element(vide, 'titre');
  const message = element(vide, 'message');
  return (
    <div style={{ position: 'absolute', left: 0, top: 0 }}>
      <BrowserFrame capture={vide} defilement={defilementA(frame)}>
        {/* Le texte tapé : la capture remplie se dévoile sur la largeur du texte */}
        {/* (à l'intérieur de la bordure du champ, qui change avec le focus) */}
        <TypingCaptures rempli={C(alerteTitre)} cadre={dans(titre, 240)} de={T.titre} caracteres={33} vitesse={16} />
        <Etat capture={C(alerteTitre)} de={T.clicAttention - 2} fondu={1} />
        <Etat capture={C(alerteAttention)} de={T.clicAttention + 3} />
        <TypingCaptures rempli={C(alerteMessage)} cadre={dans({ ...message, height: 46 }, 236)} de={T.message} caracteres={34} vitesse={50} />
        <Etat capture={C(alerteMessage)} de={T.clicFin - 2} fondu={1} />
        <Zones
          rempli={C(alerteFin)}
          zones={[
            { cadre: element(vide, 'fin'), de: T.clicFin + 5 },
            { cadre: element(vide, 'heureFin'), de: T.clicHeure + 5 },
          ]}
        />
        {/* Plus aucun champ actif : le formulaire complet */}
        <Etat capture={C(alerteFin)} de={T.clicHeure + 14} fondu={4} />
      </BrowserFrame>
      <Ecran capture={C(alerteApercu)} de={APERCU} />
      <Ecran capture={C(alertePubliee)} de={PUBLIEE} />
      <Ecran capture={liste} de={T.liste} />
    </div>
  );
}

function Telephone() {
  return (
    <div style={{ position: 'absolute', left: X_TEL, top: Y_TEL }}>
      <PhoneFrame capture={telephoneSans} hauteur={HAUTEUR_ECRAN_TEL}>
        <Etat capture={telephoneAvec} de={BANDEAU_VISIBLE} fondu={2} />
        <Rechargement de={T.rechargement} duree={DUREE_RECHARGEMENT} largeur={telephoneSans.largeur} />
      </PhoneFrame>
    </div>
  );
}

function curseur(): PointCurseur[] {
  const apercu = element(vide, 'apercu');
  const boutonApercu = { x: centre(apercu).x, y: centre(nav(apercu)).y - DEFILEMENT };
  return [
    { image: 0, x: 1150, y: 800 },
    { image: T.clicTitre, ...centre(nav(element(vide, 'titre'))), clic: true },
    { image: T.titre + 10, x: 1010, y: nav(element(vide, 'titre')).y + 70 },
    { image: T.clicAttention, ...centre(nav(element(vide, 'attention'))), clic: true },
    { image: T.clicMessage, ...centre(nav(element(vide, 'message'))), clic: true },
    // Le curseur attend la fin de la saisie
    { image: T.clicFin - 8, x: centre(element(vide, 'message')).x + 40, y: centre(nav(element(vide, 'message'))).y + 20 },
    { image: T.clicFin, ...centre(nav(element(vide, 'fin'))), clic: true },
    { image: T.clicHeure, ...centre(nav(element(vide, 'heureFin'))), clic: true },
    { image: T.defilement, x: 1000, y: 820 },
    { image: T.clicApercu, ...boutonApercu, clic: true },
    { image: T.clicPublier, ...centre(nav(element(C(alerteApercu), 'publier'))), clic: true },
    // Puis le curseur s'écarte : on regarde le téléphone
    { image: T.clicPublier + 24, x: 1250, y: 620 },
  ];
}

export function V2Alerte() {
  return (
    <AbsoluteFill>
      <Fond />
      <Camera
        largeur={LARGEUR}
        hauteur={HAUTEUR}
        marge={MARGE}
        etapes={[
          vers(T.zoomFormulaire, 0.8, FORMULAIRE_HAUT),
          vers(T.descente, 0.8, FORMULAIRE_BAS),
          // Tout l'écran partagé, une fois l'aperçu affiché : la publication, le téléphone à côté
          vers(T.recul, 0.8, null),
          vers(T.versTelephone, 0.8, HAUT_TELEPHONE),
          vers(T.grosPlan, 0.8, BANDEAU, A_DROITE_DE_L_ADMIN),
          vers(T.ecranPartage, 0.8, null),
          vers(T.versListe, 0.8, LISTE, SOUS_LA_BARRE_LATERALE),
        ]}
        superposition={(versEcran, echelle) => <Cursor points={curseur()} versEcran={versEcran} echelle={echelle} />}
      >
        <div style={{ position: 'relative', width: LARGEUR, height: HAUTEUR }}>
          <Administration />
          <Telephone />
        </div>
      </Camera>
      <Chronometre de={T.clicPublier} a={BANDEAU_VISIBLE} jusqua={T.versListe} />
      <Callout texte="Retrait automatique mardi à 12 h" de={T.legende} position={{ x: POSITION_LEGENDE.x, y: POSITION_LEGENDE.y - 44 }} />
      <Musique id={script.id} segments={SEGMENTS} />
      <VoixOff timings={timings as Timings} segments={SEGMENTS} />
    </AbsoluteFill>
  );
}
