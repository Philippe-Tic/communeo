/**
 * V5. Le devis en ligne (20 s).
 *
 * Quatre scènes, une par segment du script (heures calées sur la voix, sur les temps de la musique),
 * avec le montage commun (composants/Montage.tsx) : l'offre, la saisie du devis, la validation puis le
 * devis en PDF, ses conditions (Chorus Pro, virement). Repères en secondes à vitesse posée (`s(…)`).
 */
import { AbsoluteFill, Sequence } from 'remotion';
import { BARRE } from '../../composants/BrowserFrame';
import { Callout } from '../../composants/Callout';
import { versEcranPour } from '../../composants/Camera';
import { Etat } from '../../composants/Etat';
import { Entree, marge, nav, Navigateur, rythme, Scenes, union } from '../../composants/Montage';
import { TypingCaptures } from '../../composants/Typing';
import { centre, element, type Capture, type Rect } from '../../lib/geometrie';
import type { Timings } from '../../lib/script';
import { script } from './script';
import timings from './timings.json';

import offreJson from '../../../public/captures/v5-devis/offre.json';
import devisVide from '../../../public/captures/v5-devis/devis-vide.json';
import devisSiret from '../../../public/captures/v5-devis/devis-siret.json';
import devisSignataire from '../../../public/captures/v5-devis/devis-signataire.json';
import devisQualite from '../../../public/captures/v5-devis/devis-qualite.json';
import devisCoche from '../../../public/captures/v5-devis/devis-coche.json';
import devisValide from '../../../public/captures/v5-devis/devis-valide.json';
import devisPdf from '../../../public/captures/v5-devis/devis-pdf.json';

const C = <T,>(capture: T) => capture as unknown as Capture;

const { s, vers, au } = rythme();

/** Sous la barre du navigateur : jamais de vide sous la page quand on cadre le bas de l'écran */
const SOUS_LA_BARRE: Rect = { x: 0, y: BARRE, width: 1440, height: 900 };

/** Le formulaire, du SIRET au bouton « Valider le devis » (fin de la scène 2, début de la scène 3) */
const cadreFormulaire = (): Rect => {
  const vide = C(devisVide);
  return marge(nav(union(element(vide, 'siret'), element(vide, 'valider'), element(vide, 'qualite'))), 30);
};

/*
 * Le PDF à 160 % dans une fenêtre haute (visionneuse de Chromium, pas d'éléments repérables : cadrages
 * lus sur la capture, vérifiés à la planche). Le texte va de x 192 à 1248 ; on ne remonte jamais
 * au-dessus du bloc « Client » (y 325) : l'en-tête de l'émetteur n'est pas renseigné en développement.
 */
const PDF_BORNES: Rect = { x: 0, y: BARRE + 300, width: 1440, height: 1960 - 300 };
/** Client, désignation, montants */
const PDF_MONTANTS: Rect = nav({ x: 180, y: 315, width: 1080, height: 485 });
/** Conditions et « Bon pour accord » horodaté */
/** (aussi le recul de la fin, après le zoom sur la phrase des conditions) */
const PDF_ACCORD: Rect = nav({ x: 180, y: 970, width: 1080, height: 295 });

// ---------------------------------------------------------------------------------------------------
// 1. L'offre : le prix d'après la population INSEE

function Offre() {
  const offre = C(offreJson);
  // La carte de l'offre : le prix, la tranche et la population INSEE (le zoom maximal y est déjà atteint)
  return <Navigateur capture={offre} etapes={[vers(0.5, marge(nav(element(offre, 'offre')), 30))]} />;
}

// ---------------------------------------------------------------------------------------------------
// 2. Le devis : SIRET, signataire, qualité, case à cocher

function Saisie() {
  const vide = C(devisVide);
  const siret = C(devisSiret);
  const signataire = C(devisSignataire);
  const T = { siret: 1.7, nom: 3.0, qualite: 4.2, coche: 5.0, valider: 5.8 };
  const cadre = cadreFormulaire();
  const versEcran = versEcranPour(cadre, { largeur: vide.largeur, hauteur: vide.hauteur + BARRE }, 90, SOUS_LA_BARRE);
  // À droite du bouton et du lien « Voir le devis (PDF) » : une zone blanche du formulaire
  const legende = versEcran(nav({ x: element(vide, 'valider').x + 330, y: element(vide, 'valider').y - 2, width: 0, height: 0 }));
  return (
    <AbsoluteFill>
      <Navigateur
        capture={vide}
        etapes={[vers(0.8, cadre, SOUS_LA_BARRE)]}
        curseur={[
          au(0, { x: 1300, y: 700 }),
          au(T.siret, centre(nav(element(vide, 'siret'))), true),
          au(T.nom, centre(nav(element(vide, 'signataire'))), true),
          au(T.qualite, centre(nav(element(vide, 'qualite'))), true),
          au(T.coche, centre(nav(element(vide, 'accepte'))), true),
          au(T.valider, { x: centre(nav(element(vide, 'valider'))).x + 30, y: centre(nav(element(vide, 'valider'))).y + 30 }),
        ]}
      >
        <TypingCaptures rempli={siret} cadre={element(siret, 'siret')} de={s(T.siret + 0.2)} caracteres={17} vitesse={24} />
        <TypingCaptures rempli={signataire} cadre={element(signataire, 'signataire')} de={s(T.nom + 0.2)} caracteres={13} vitesse={20} />
        <Etat capture={C(devisQualite)} de={s(T.qualite + 0.2)} />
        <Etat capture={C(devisCoche)} de={s(T.coche + 0.15)} fondu={3} />
      </Navigateur>
      <Callout texte="SIRET contrôlé automatiquement" de={s(2.7)} position={{ x: legende.x, y: legende.y }} />
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------------------------------
// 3. Validation, puis le devis et bon de commande en PDF

function Validation() {
  const coche = C(devisCoche);
  const valide = C(devisValide);
  const pdf = C(devisPdf);
  const T = { valider: 0.9, encadre: 1.9, telecharger: 3.1, pdf: 3.4, accord: 4.7 };
  const bouton = centre(nav(element(coche, 'valider')));
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={s(T.pdf) + 8}>
        <Navigateur
          capture={coche}
          // La scène commence sur le cadrage où la saisie s'est arrêtée
          etapes={[{ de: -1, a: 0, cadre: cadreFormulaire(), bornes: SOUS_LA_BARRE }, vers(T.encadre, marge(nav(element(valide, 'valide')), 20), SOUS_LA_BARRE)]}
          curseur={[
            au(0, { x: bouton.x + 30, y: bouton.y + 30 }),
            au(T.valider, bouton, true),
            au(T.encadre - 0.2, { x: bouton.x + 120, y: bouton.y + 60 }),
            au(T.telecharger, centre(nav(element(valide, 'pdf'))), true),
          ]}
        >
          <Etat capture={valide} de={s(T.valider + 0.2)} fondu={8} />
        </Navigateur>
      </Sequence>
      <Sequence from={s(T.pdf)}>
        <Entree>
          <Navigateur capture={pdf} etapes={[{ de: -1, a: 0, cadre: PDF_MONTANTS, bornes: PDF_BORNES }, vers(T.accord - T.pdf, PDF_ACCORD, PDF_BORNES)]} />
        </Entree>
      </Sequence>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------------------------------
// 4. Les conditions du devis (Chorus Pro, virement sous 30 jours), puis retour au devis validé

/**
 * Le bloc « Conditions » sur toute sa largeur (x 192 → 1248) : aucune ligne coupée au bord, d'où un
 * zoom modéré (×1,6, la largeur commande).
 */
const PDF_CONDITIONS: Rect = nav({ x: 180, y: 975, width: 1080, height: 135 });
/** Recul : toute la largeur de la page (x 86 → 1354), conditions et « Bon pour accord » */
const PDF_RECUL: Rect = nav({ x: 80, y: 900, width: 1280, height: 380 });

function Conditions() {
  const pdf = C(devisPdf);
  const valide = C(devisValide);
  const T = { serre: 0.75, legende: 1.6, recul: 3.9, admin: 5.5 };
  const versEcran = versEcranPour(PDF_CONDITIONS, { largeur: pdf.largeur, hauteur: pdf.hauteur + BARRE }, 90, PDF_BORNES);
  // Sous l'encadré « Bon pour accord » : le blanc du bas de la page
  const legende = versEcran(nav({ x: 192, y: 1272, width: 0, height: 0 }));
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={s(T.admin) + 8}>
        <Navigateur
          capture={pdf}
          etapes={[{ de: -1, a: 0, cadre: PDF_ACCORD, bornes: PDF_BORNES }, vers(T.serre, PDF_CONDITIONS, PDF_BORNES), vers(T.recul, PDF_RECUL, PDF_BORNES)]}
        />
        {/* La légende part avant le recul : jamais de légende pendant un mouvement */}
        <Callout texte="Chorus Pro, virement sous 30 jours" de={s(T.legende)} a={s(T.recul)} position={legende} />
      </Sequence>
      {/* Retour à l'administration : le devis validé, l'équipe Communeo prend la suite */}
      <Sequence from={s(T.admin)}>
        <Entree>
          <Navigateur capture={valide} etapes={[{ de: -1, a: 0, cadre: marge(nav(element(valide, 'valide')), 60), bornes: SOUS_LA_BARRE }]} />
        </Entree>
      </Sequence>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------------------------------

const SCENES = [Offre, Saisie, Validation, Conditions];

export function V5Devis() {
  return <Scenes script={script} timings={timings as Timings} scenes={SCENES} />;
}
