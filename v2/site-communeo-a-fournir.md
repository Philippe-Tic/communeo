# Site de Communeo : contenus à fournir et points à confirmer

Tout ce qui manque pour mettre communeo.fr en ligne (PR #341). Déposez les contenus dans le dossier
`v2/contenus-site/` (arborescence proposée en fin de document) ; je les intègre ensuite.

Pour vérifier ce qui reste dans les pages : `pnpm --filter @communeo/site build && pnpm --filter @communeo/site a-fournir`.

Légende : **Bloquant** = le site ne peut pas être mis en ligne sans. **Souhaitable** = le site peut
partir sans, l'emplacement reste masqué.

---

## 1. Textes juridiques (bloquant)

| # | Contenu | Page | Précisions |
|---|---|---|---|
| 1.1 | **Adresse de l'éditeur** | /mentions-legales | Adresse postale de l'entreprise individuelle (domiciliation possible). |
| 1.2 | **Hébergeur du site vitrine** | /mentions-legales | Raison sociale, adresse, téléphone. Si le site est chez Netlify comme prévu : Netlify, Inc. (à vérifier sur leur site). L'application (app.communeo.fr) est chez OVH : à mentionner aussi si vous le souhaitez. |
| 1.3 | **Propriété intellectuelle** | /mentions-legales | Quelques lignes : textes, logo, captures appartiennent à Communeo ; reproduction interdite sans accord. |
| 1.4 | **Conditions générales de vente et d'utilisation (CGV/CGU)** | /conditions | Texte complet, idéalement relu par un juriste. Doit être cohérent avec le devis et la facturation : abonnement annuel, reconduction tacite, résiliation à l'échéance avec un mois de préavis, essai de 30 jours, données gardées 6 mois après l'arrêt, paiement par virement sous 30 jours. Cette page sert aussi de lien « conditions d'utilisation » à l'inscription (`VITE_TERMS_URL` = https://communeo.fr/conditions). |
| 1.5 | **Contrat de sous-traitance RGPD** (art. 28) | /conditions | Communeo traite des données pour le compte des communes (messages des habitants, inscrits à la lettre, comptes). Texte ou PDF téléchargeable. |
| 1.6 | **Politique de données personnelles du site** | /donnees-personnelles | Responsable du traitement, finalités (répondre aux messages du formulaire), base légale (consentement), durée de conservation (voir 2.2), destinataires (vous ; l'e-mail transite par Resend), droits (accès, rectification, effacement, opposition) et comment les exercer, réclamation auprès de la CNIL. |
| 1.7 | **Déclaration d'accessibilité du site** | /accessibilite | État de conformité RGAA 4.1, résultats des tests, contenus non accessibles, date, contact, voies de recours. Je peux rédiger une base à partir des tests automatiques (axe, 320 px, texte à 200 %) si vous voulez ; un audit manuel reste nécessaire pour annoncer un taux. |
| 1.8 | **Statut d'accessibilité affiché dans le pied de page** | toutes les pages | Aujourd'hui « partiellement conforme [à confirmer] ». Sans audit, la mention correcte est « non conforme ». À décider avec 1.7. |

## 2. Décisions et chiffres à confirmer (bloquant)

| # | Point | Où | Ce qui est écrit aujourd'hui | À confirmer |
|---|---|---|---|---|
| 2.1 | **Délai de mise en ligne définitive** après validation du devis | /comment-ca-marche, étape 5 | « [Délai à confirmer] » | Par exemple « Sous 2 jours ouvrés ». C'est un engagement : l'équipe valide chaque passage en live. |
| 2.2 | **Durée de conservation des messages du formulaire de contact** | /contact, /donnees-personnelles | « supprimées [durée de conservation à confirmer] » | Rien n'est stocké côté Communeo : les messages restent dans votre boîte e-mail. Indiquer la durée pendant laquelle vous les gardez (par exemple 1 an, ou 3 ans pour un prospect). |
| 2.3 | **Franchise de TVA** (art. 293 B du CGI) | accueil, /tarifs, /questions | « TVA non applicable, art. 293 B du CGI : le prix HT est le prix payé » (4 endroits) | Vrai seulement si vous êtes en franchise en base et que `COMMUNEO_VAT_RATE=0` sur le serveur. Sinon, j'enlève la mention et j'affiche les prix TTC. |
| 2.4 | **Grille de tarifs** | accueil, /tarifs | 290 / 390 / 590 / 890 / 1 290 € HT par an | Le code indique « tarifs d'exemple, à confirmer ». Ce sont aussi les prix des devis : un changement se fait à un seul endroit (`packages/core/src/site/pricing.ts`). |
| 2.5 | **« Environ 30 secondes »** pour une mise en ligne | accueil, /fonctionnalites | tel quel | Jamais mesuré. Je peux chronométrer une mise en ligne en production, ou on remplace par « en moins d'une minute » si c'est le cas. |
| 2.6 | **« Plus de 3 000 fiches » Service-Public** | accueil, /fonctionnalites, /questions | tel quel | Ordre de grandeur de l'archive DILA ; le nombre exact figure dans les journaux du serveur (« Search index for … entries »). À vérifier une fois. |
| 2.7 | **Réponse sous 72 heures**, assistance uniquement par e-mail | /contact, /questions, bandeaux | tel quel | Engagement de service à tenir. |
| 2.8 | **Nombre d'utilisateurs illimité** | /questions | « sans limite de nombre » | Vrai dans le code aujourd'hui. Le garder, ou fixer une limite par offre. |
| 2.9 | **Export des contenus** | /questions | Retiré (la fonction n'existe pas) | Confirmer qu'on ne le promet pas. Sinon, c'est une fonction à développer. |
| 2.10 | **Adresse d'envoi des messages du formulaire** | serveur | `SIGNUP_NOTIFY_EMAIL` | Vérifier que la variable est bien définie sur le serveur de production (sinon le formulaire répond « indisponible »). |

## 3. Textes corrigés par rapport aux maquettes (à relire)

Le produit ne fait pas exactement ce que disaient les maquettes ; j'ai reformulé. À valider ou à
réécrire :

- **Inscription** : « la confirmation part à l'adresse officielle » → « l'inscription est validée depuis
  l'adresse officielle de la mairie connue de l'Annuaire ; si elle n'y figure pas, l'équipe vérifie ».
- **Pré-remplissage** : « à l'inscription, le site est déjà rempli » → « l'assistant de création remplit le
  site avec les données publiques (coordonnées, horaires, population). Il peut être en ligne dès le
  premier jour ».
- **Site en ligne pendant l'essai** : « dès le premier jour » → « dès l'inscription validée ».
- **Sauvegardes** : « une page supprimée par erreur se récupère » → « en cas d'incident, les contenus
  sont restaurés par l'équipe ».
- **Reprise d'un ancien site** : ajout de « les adresses de l'ancien site peuvent être redirigées vers les
  nouvelles pages ».

## 4. Page « À propos » (bloquant)

| # | Contenu | Précisions |
|---|---|---|
| 4.1 | **Votre parcours** | 3 ou 4 phrases : métier d'origine, lien avec les communes, ce qui vous a amené à créer Communeo. |
| 4.2 | **Pourquoi Communeo** | La motivation : le constat de départ dans les petites mairies, ce que Communeo veut changer pour elles. |
| 4.3 | Portrait (facultatif) | Photo en lumière naturelle, cadrage buste, format portrait 4/5, 1 200 px de haut minimum. |

## 5. Vidéos (souhaitable)

Chaque vidéo : fichier MP4 (1080p), **sous-titres** (.vtt) et **transcription** texte (obligatoires pour
l'accessibilité). Chargement seulement au clic.

| # | Vidéo | Durée | Où | Contenu attendu |
|---|---|---|---|---|
| V1 | Démonstration | 1 min 30 | accueil, /comment-ca-marche | De l'inscription au site en ligne. |
| V2 | Alerte | 20 s | accueil (section Alertes), /fonctionnalites | Publier une alerte, la voir apparaître sur le site. |
| V3 | Un contenu, quatre thèmes | 15 s | /themes | Changer de thème, les contenus suivent. |
| V5 | Le devis en ligne | 20 s | /tarifs | Du prix affiché à la validation du devis. |

## 6. Illustrations (souhaitable)

Style de la direction artistique « le papier et le sapin ». SVG de préférence, sinon PNG 2× ; chacune
avec une phrase décrivant l'image (ou « décorative »).

| # | Illustration | Où | Format |
|---|---|---|---|
| 6.1 | Un ordinateur poussiéreux et un cadenas | accueil, carte « Le vieux site » | 16/9 |
| 6.2 | Une chaise vide et un carton | accueil, carte « Le site du bénévole parti » | 16/9 |
| 6.3 | Une pile de textes de loi et un point d'interrogation | accueil, carte « Des obligations floues » | 16/9 |
| 6.4 | La boîte aux lettres de la mairie | /contact, message envoyé | 16/7 |
| 6.5 | Un panneau de direction « Communeo » perdu dans un champ | page introuvable | carré |
| 6.6 | Photo de la place du village (facultatif) | téléphone de l'accueil | 16/9, petite |

## 7. Divers

- **Image de partage** (réseaux sociaux, messageries) : 1 200 × 630 px. Je peux la générer aux couleurs du
  site si vous n'en avez pas.
- **Nom de domaine** : créer le site Netlify (base directory `apps/site`) et y brancher communeo.fr et
  www.communeo.fr.

---

## Arborescence proposée pour le dossier

```
v2/contenus-site/
├── decisions.md            ← réponses aux points 2.1 à 2.10 et validation des textes du point 3
├── legal/
│   ├── mentions-legales.md     (1.1, 1.2, 1.3)
│   ├── conditions.md           (1.4, ou .pdf/.docx)
│   ├── sous-traitance-rgpd.pdf (1.5)
│   ├── donnees-personnelles.md (1.6)
│   └── accessibilite.md        (1.7, 1.8)
├── a-propos/
│   ├── a-propos.md             (4.1, 4.2)
│   └── portrait.jpg            (4.3, facultatif)
├── videos/
│   ├── v1-demo.mp4  v1-demo.vtt  v1-demo-transcription.md
│   └── …
└── illustrations/
    ├── constat-vieux-site.svg
    └── …
```

Un fichier Word ou PDF convient aussi pour les textes juridiques : je les reprends en pages web.
