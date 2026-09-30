/**
 * V1. Démonstration : de l'inscription au site en ligne (1 min 30).
 *
 * Six scènes, une par segment du script (leurs heures suivent la voix, voir timings.json), en fondu
 * enchaîné. Dans une scène, les heures sont en secondes depuis son début (`s(…)`). Règles de montage :
 * un seul mouvement de caméra à la fois, jamais pendant un changement d'écran ; chaque écran reste au
 * moins 2 s à l'image avant qu'on agisse dessus ; 5 légendes au plus dans toute la vidéo.
 */
import type { ReactNode } from 'react';
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { BARRE, BrowserFrame } from '../../composants/BrowserFrame';
import { Callout } from '../../composants/Callout';
import { Camera, versEcranPour, type EtapeCamera } from '../../composants/Camera';
import { Cursor, type PointCurseur } from '../../composants/Cursor';
import { EndCard } from '../../composants/EndCard';
import { Etat } from '../../composants/Etat';
import { Fond } from '../../composants/Fond';
import { BORD, ETAT, PhoneFrame } from '../../composants/PhoneFrame';
import { Typing, TypingCaptures } from '../../composants/Typing';
import { VoixOff } from '../../composants/VoixOff';
import { FPS } from '../../lib/format';
import { centre, decale, element, type Capture, type Rect } from '../../lib/geometrie';
import { chronologie, type Timings } from '../../lib/script';
import { script } from './script';
import timings from './timings.json';

import inscriptionVide from '../../../public/captures/v1-demo/inscription-vide.json';
import inscriptionSuggestions from '../../../public/captures/v1-demo/inscription-suggestions.json';
import inscriptionCommune from '../../../public/captures/v1-demo/inscription-commune.json';
import inscriptionRemplie from '../../../public/captures/v1-demo/inscription-remplie.json';
import assistantRecherche from '../../../public/captures/v1-demo/assistant-recherche.json';
import assistantChargement from '../../../public/captures/v1-demo/assistant-chargement.json';
import assistantRempli from '../../../public/captures/v1-demo/assistant-rempli.json';
import assistantTheme from '../../../public/captures/v1-demo/assistant-theme.json';
import assistantThemeChoisi from '../../../public/captures/v1-demo/assistant-theme-choisi.json';
import tableauDeBord from '../../../public/captures/v1-demo/tableau-de-bord.json';
import editeur from '../../../public/captures/v1-demo/editeur.json';
import editeurTexte from '../../../public/captures/v1-demo/editeur-texte.json';
import editeurTexteTape from '../../../public/captures/v1-demo/editeur-texte-tape.json';
import editeurCatalogue from '../../../public/captures/v1-demo/editeur-catalogue.json';
import editeurImage from '../../../public/captures/v1-demo/editeur-image.json';
import editeurDocument from '../../../public/captures/v1-demo/editeur-document.json';
import editeurEnregistre from '../../../public/captures/v1-demo/editeur-enregistre.json';
import apercu from '../../../public/captures/v1-demo/apercu.json';
import melVerification from '../../../public/captures/v1-demo/mise-en-ligne-verification.json';
import melPages from '../../../public/captures/v1-demo/mise-en-ligne-pages.json';
import melPublication from '../../../public/captures/v1-demo/mise-en-ligne-publication.json';
import melOk from '../../../public/captures/v1-demo/mise-en-ligne-ok.json';
import siteOrdinateur from '../../../public/captures/v1-demo/site-ordinateur.json';
import siteTelephone from '../../../public/captures/v1-demo/site-telephone.json';
import siteTelephoneDemarches from '../../../public/captures/v1-demo/site-telephone-demarches.json';

const C = <T,>(capture: T) => capture as unknown as Capture;

/** Secondes → images, dans le repère de la scène */
const s = (secondes: number) => Math.round(secondes * FPS);
/** Fondu enchaîné entre deux scènes, ou deux écrans d'une même scène */
const FONDU = 10;
/** Durée d'un mouvement de caméra */
const MOUVEMENT = 1;

/** Rectangle d'une capture placée dans un navigateur (sous la barre) */
const nav = (r: Rect): Rect => decale(r, 0, BARRE);
const union = (...rects: Rect[]): Rect => {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  return { x, y, width: Math.max(...rects.map((r) => r.x + r.width)) - x, height: Math.max(...rects.map((r) => r.y + r.height)) - y };
};
const marge = (r: Rect, m: number): Rect => ({ x: r.x - m, y: r.y - m, width: r.width + 2 * m, height: r.height + 2 * m });

/** Mouvement de caméra de `de` secondes pendant 1 s, vers `cadre` (`null` : tout) */
const vers = (de: number, cadre: Rect | null, bornes?: Rect): EtapeCamera => ({ de: s(de), a: s(de + MOUVEMENT), cadre, bornes });
/** Point du curseur à la seconde `t` */
const au = (t: number, point: { x: number; y: number }, clic = false): PointCurseur => ({ image: s(t), ...point, clic });

/** Apparition en fondu (une scène ou un écran qui entre) */
function Entree({ children }: { children: ReactNode }) {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: interpolate(frame, [0, FONDU], [0, 1], { extrapolateRight: 'clamp' }) }}>{children}</AbsoluteFill>;
}

/** Un navigateur cadré par la caméra, avec le curseur */
function Navigateur({
  capture,
  etapes,
  curseur,
  defilement,
  children,
}: {
  capture: Capture;
  etapes: EtapeCamera[];
  curseur?: PointCurseur[];
  defilement?: number;
  children?: ReactNode;
}) {
  return (
    <AbsoluteFill>
      <Fond />
      <Camera
        largeur={capture.largeur}
        hauteur={(capture.vue ?? capture.hauteur) + BARRE}
        etapes={etapes}
        superposition={(versEcran, echelle) => (curseur ? <Cursor points={curseur} versEcran={versEcran} echelle={echelle} /> : null)}
      >
        <BrowserFrame capture={capture} defilement={defilement}>
          {children}
        </BrowserFrame>
      </Camera>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------------------------------
// 1. Inscription : la commune, puis le nom et l'e-mail

function Inscription() {
  const vide = C(inscriptionVide);
  const suggestions = C(inscriptionSuggestions);
  const commune = C(inscriptionCommune);
  const remplie = C(inscriptionRemplie);
  // Le champ commune porte une loupe à gauche : le texte tapé commence après
  const champ = element(vide, 'commune');
  const saisieCommune: Rect = { ...champ, x: champ.x + 32, width: champ.width - 70 };
  // Toute la carte d'inscription, du logo au lien « Se connecter » : rien de coupé au bord
  const carte: Rect = { x: 470, y: 40, width: 500, height: 790 };
  return (
    <Navigateur
      capture={vide}
      etapes={[vers(1.2, nav(carte))]}
      curseur={[
        au(0, { x: 1150, y: 760 }),
        au(3.2, centre(nav(champ)), true),
        au(5.6, { x: 1150, y: 760 }),
        au(6.2, centre(nav(element(suggestions, 'suggestion'))), true),
        au(7.2, centre(nav(element(commune, 'prenom'))), true),
      ]}
    >
      <Typing cadre={saisieCommune} de={s(3.5)} texte="Saint-Au" retrait={14} taille={14} />
      <Etat capture={suggestions} de={s(4.6)} />
      <Etat capture={commune} de={s(6.4)} />
      <TypingCaptures rempli={remplie} cadre={element(remplie, 'prenom')} de={s(7.5)} caracteres={6} vitesse={11} />
      <TypingCaptures rempli={remplie} cadre={element(remplie, 'nom')} de={s(8.3)} caracteres={5} vitesse={11} />
      <TypingCaptures rempli={remplie} cadre={element(remplie, 'email')} de={s(9)} caracteres={36} vitesse={22} />
    </Navigateur>
  );
}

// ---------------------------------------------------------------------------------------------------
// 2. Assistant : les données publiques arrivent seules, puis le thème

function Assistant() {
  const recherche = C(assistantRecherche);
  const rempli = C(assistantRempli);
  const theme = C(assistantTheme);
  const champs = union(element(rempli, 'population'), element(rempli, 'adresse'), element(rempli, 'telephone'), element(rempli, 'email'), element(rempli, 'gps'));
  const formulaire = union(element(recherche, 'suggestion'), element(recherche, 'gps'));
  // Les champs et, à droite de la carte, le fond de page où se pose la légende
  const zoomChamps: Rect = { ...nav(champs), x: champs.x - 20, width: 1420 - champs.x };
  const legende = versEcranPour(zoomChamps, { largeur: recherche.largeur, hauteur: recherche.hauteur + BARRE })({ x: 1100, y: nav(element(rempli, 'telephone')).y });
  const THEME_A = 8.6;
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={s(THEME_A) + FONDU}>
        <Navigateur
          capture={recherche}
          etapes={[vers(0.4, marge(nav(formulaire), 30)), vers(4.4, zoomChamps)]}
          // Après le clic, le curseur s'écarte vers le bas : la légende arrive à droite des champs
          curseur={[au(0, { x: 1180, y: 380 }), au(2.6, centre(nav(element(recherche, 'suggestion'))), true), au(3.6, { x: 760, y: 880 })]}
        >
          <Etat capture={C(assistantChargement)} de={s(2.8)} fondu={4} />
          <Etat capture={rempli} de={s(3.6)} fondu={12} />
        </Navigateur>
        <Callout texte="Rempli automatiquement" de={s(5.6)} a={s(THEME_A)} position={legende} />
      </Sequence>
      <Sequence from={s(THEME_A)}>
        <Entree>
          <Navigateur
            capture={theme}
            etapes={[vers(0.6, marge(nav({ x: 340, y: 60, width: 760, height: 800 }), 0))]}
            curseur={[au(0, { x: 1150, y: 700 }), au(3, centre(nav(element(theme, 'institutionnel'))), true)]}
          >
            <Etat capture={C(assistantThemeChoisi)} de={s(3.2)} />
          </Navigateur>
        </Entree>
      </Sequence>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------------------------------
// 3. Tableau de bord, puis l'éditeur par blocs : texte, image, document, enregistrement automatique

function Editeur() {
  const tdb = C(tableauDeBord);
  const base = C(editeur);
  const texte = C(editeurTexte);
  const tape = C(editeurTexteTape);
  const catalogue = C(editeurCatalogue);
  const image = C(editeurImage);
  const document = C(editeurDocument);
  const enregistre = C(editeurEnregistre);
  const EDITEUR_A = 3.4;
  // Repères (secondes depuis l'ouverture de l'éditeur)
  const T = { texte: 2.2, frappe: 3.8, ajouter: 7.8, catalogue: 8.1, image: 9.9, document: 12.4, dezoom: 14.6, enregistre: 15.8 };
  const zone = element(texte, 'zone');
  const colonne: Rect = { x: 250, y: 60, width: 660, height: 820 };
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={s(EDITEUR_A) + FONDU}>
        <Navigateur capture={tdb} etapes={[]} curseur={[au(0, { x: 1300, y: 760 }), au(2.4, centre(nav(element(tdb, 'page'))), true)]} />
        <Callout texte="Aucune formation nécessaire" de={s(0.4)} a={s(EDITEUR_A)} position="bas-droite" />
      </Sequence>
      <Sequence from={s(EDITEUR_A)}>
        <Entree>
          <Navigateur
            capture={base}
            etapes={[
              // Chaque mouvement après le changement d'écran, jamais pendant
              vers(0.6, nav(colonne)),
              vers(T.texte + 0.6, marge(nav(zone), 90)),
              vers(T.ajouter - 1.6, null),
              vers(T.image + 0.5, marge(nav(element(image, 'image')), 190)),
              vers(T.document + 0.5, marge(nav(element(document, 'document')), 150)),
              vers(T.dezoom, null),
              vers(T.enregistre + 0.5, marge(nav(element(enregistre, 'enregistrement')), 110), { x: 0, y: BARRE, width: 1440, height: 900 }),
            ]}
            curseur={[
              au(0, { x: 1100, y: 800 }),
              au(T.texte, centre(nav(element(base, 'texte'))), true),
              au(T.frappe - 0.2, { x: zone.x + zone.width - 60, y: zone.y + 30 + BARRE }),
              au(T.ajouter, centre(nav(element(tape, 'ajouter'))), true),
              au(T.image - 0.3, centre(nav(element(catalogue, 'image'))), true),
              au(T.image + 0.6, { x: 1000, y: 780 }),
            ]}
          >
            <Etat capture={texte} de={s(T.texte + 0.2)} />
            <TypingCaptures rempli={tape} cadre={{ ...zone, height: 50 }} de={s(T.frappe)} caracteres={40} vitesse={14} depuis={0.36} />
            <Etat capture={tape} de={s(T.ajouter - 0.4)} fondu={2} />
            <Etat capture={catalogue} de={s(T.catalogue)} />
            <Etat capture={image} de={s(T.image)} />
            <Etat capture={document} de={s(T.document)} />
            <Etat capture={enregistre} de={s(T.enregistre)} />
          </Navigateur>
        </Entree>
      </Sequence>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------------------------------
// 4. Aperçu, puis « Mettre en ligne » et ses étapes

function MiseEnLigne() {
  const enregistre = C(editeurEnregistre);
  const verification = C(melVerification);
  const ok = C(melOk);
  const MEL_A = 8.2;
  const barre = nav({ x: 480, y: 0, width: 700, height: 140 });
  const carte = marge(nav(element(verification, 'etat')), 40);
  const legende = versEcranPour(carte, { largeur: verification.largeur, hauteur: verification.hauteur + BARRE })(nav({ x: element(ok, 'etat').x + 560, y: element(ok, 'etat').y + 40, width: 0, height: 0 }));
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={s(MEL_A) + FONDU}>
        <Navigateur
          capture={enregistre}
          etapes={[vers(0.8, barre), vers(2.8, null), vers(5.8, barre)]}
          curseur={[
            au(0, { x: 1100, y: 420 }),
            au(2.1, centre(nav(element(enregistre, 'apercu'))), true),
            au(4, { x: 900, y: 500 }),
            au(7.2, centre(nav(element(enregistre, 'mettreEnLigne'))), true),
          ]}
        >
          <Etat capture={C(apercu)} de={s(2.3)} />
          {/* Fermeture de l'aperçu, retour à l'éditeur */}
          <Etat capture={enregistre} de={s(5.2)} fondu={6} />
        </Navigateur>
      </Sequence>
      <Sequence from={s(MEL_A)}>
        <Entree>
          <Navigateur capture={verification} etapes={[vers(0.4, carte)]}>
            <Etat capture={C(melPages)} de={s(2.4)} />
            <Etat capture={C(melPublication)} de={s(3.8)} />
            <Etat capture={C(melOk)} de={s(5.2)} />
          </Navigateur>
          <Callout texte="En ligne en moins d’une minute" de={s(5.8)} position={{ x: legende.x, y: legende.y - 44 }} />
        </Entree>
      </Sequence>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------------------------------
// 5. Le site public, sur un ordinateur et un téléphone

function SitePublic() {
  const ordinateur = C(siteOrdinateur);
  const telephone = C(siteTelephone);
  const frame = useCurrentFrame();
  const ECART = 80;
  const hauteurTel = 780;
  const telephoneLargeur = telephone.largeur + 2 * BORD;
  const telephoneHauteur = hauteurTel + ETAT + 2 * BORD;
  const largeur = ordinateur.largeur + ECART + telephoneLargeur;
  const hauteur = (ordinateur.vue ?? 900) + BARRE;
  const xTel = ordinateur.largeur + ECART;
  const yTel = (hauteur - telephoneHauteur) / 2;
  // Repères
  const T = { ouvert: 3, actualites: 7.2, defile: 8.4, demarches: 12.2, preparation: 15.6, fin: 18.8 };
  const DEFILEMENT = element(ordinateur, 'actualites').y - 70;
  const defilement = interpolate(frame, [s(T.defile), s(T.defile + 1.4)], [0, DEFILEMENT], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.45, 0, 0.2, 1),
  });
  const surOrdinateur = (r: Rect, dy = 0): Rect => decale(r, 0, BARRE - dy);
  const surTelephone = (r: Rect): Rect => decale(r, xTel + BORD, yTel + BORD + ETAT);
  const ouvert = surOrdinateur(element(ordinateur, 'ouvert'));
  const actualites = surOrdinateur({ ...element(ordinateur, 'actualites'), height: 560 }, DEFILEMENT);
  const telephoneEntier: Rect = { x: xTel, y: yTel, width: telephoneLargeur, height: telephoneHauteur };
  // Le bandeau du téléphone, avec du fond à droite pour la légende
  const bandeau = surTelephone(element(telephone, 'preparation'));
  const zoomPreparation: Rect = { x: xTel - 60, y: bandeau.y - 140, width: telephoneLargeur + 760, height: 520 };
  const legende = versEcranPour(zoomPreparation, { largeur, hauteur }, 70)({ x: xTel + telephoneLargeur + 50, y: bandeau.y + 10 });
  return (
    <AbsoluteFill>
      <Fond />
      <Camera
        largeur={largeur}
        hauteur={hauteur}
        marge={70}
        etapes={[
          // La ligne d'en-tête entière (nom, horaires, contact, recherche) et le menu
          vers(T.ouvert, { x: 20, y: BARRE + 44, width: 1110, height: 190 }),
          vers(T.actualites, null),
          // (T.defile : la page de l'ordinateur défile, caméra immobile)
          vers(T.defile + 1.8, marge(actualites, 30)),
          vers(T.demarches, marge(telephoneEntier, 10)),
          vers(T.preparation, zoomPreparation),
          vers(T.fin, null),
        ]}
      >
        <div style={{ position: 'relative', width: largeur, height: hauteur }}>
          <div style={{ position: 'absolute', left: 0, top: 0 }}>
            <BrowserFrame capture={ordinateur} defilement={defilement} />
          </div>
          <div style={{ position: 'absolute', left: xTel, top: yTel }}>
            <PhoneFrame capture={telephone} hauteur={hauteurTel}>
              <Etat capture={C(siteTelephoneDemarches)} de={s(T.demarches + 1.4)} />
              {/* Retour à l'accueil pour le bandeau « Site en préparation » */}
              <Etat capture={telephone} de={s(T.preparation - 0.6)} fondu={6} />
            </PhoneFrame>
          </div>
        </div>
      </Camera>
      <Callout texte="Site en préparation pendant l’essai" de={s(T.preparation + 1.2)} a={s(T.fin)} position={legende} />
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------------------------------

const SCENES = [Inscription, Assistant, Editeur, MiseEnLigne, SitePublic, EndCard];

export function V1Demo() {
  const segments = chronologie(script, timings as Timings);
  return (
    <AbsoluteFill>
      <Fond />
      {segments.map((segment, i) => {
        const Scene = SCENES[i]!;
        const de = i === 0 ? segment.de : segment.de - FONDU;
        return (
          <Sequence key={i} from={de} durationInFrames={i < segments.length - 1 ? segment.a - de + FONDU : undefined}>
            {i === 0 ? <Scene /> : <Entree><Scene /></Entree>}
          </Sequence>
        );
      })}
      <VoixOff timings={timings as Timings} segments={segments} />
    </AbsoluteFill>
  );
}
