# Registre des traitements de Communeo (article 30 du RGPD)

> **Brouillon à faire relire.** Document interne, non publié : il est tenu à jour par Communeo et
> présenté à la CNIL si elle le demande. Deux parties : les traitements que Communeo fait **pour les
> communes** (sous-traitant, art. 30.2) et ceux qu'il fait **pour lui-même** (responsable, art. 30.1).
> Tenu au 30 septembre 2026.

**Organisme** : Philippe Chevreul, entrepreneur individuel, nom commercial Communeo, SIREN 911 592 764,
10 rue du Général de Gaulle, 76250 Déville-lès-Rouen, contact@communeo.fr.
**Délégué à la protection des données** : aucun désigné (non obligatoire). Contact : contact@communeo.fr.

---

## Partie 1. Traitements pour le compte des communes (sous-traitant, art. 30.2)

### 1.1 Responsables du traitement

Chaque commune cliente (en essai ou abonnée). La liste à jour, avec pour chacune le nom, le maire et
l'adresse e-mail officielle, est tenue dans l'espace équipe de Communeo (écran des communes).
La liste n'est pas recopiée ici : elle fait foi dans l'outil et peut être exportée à la demande.

### 1.2 Catégories de traitements effectués pour chaque commune

| Traitement | Personnes | Données |
|---|---|---|
| Hébergement et publication du site de la commune | Personnes citées dans les contenus (élus, agents, habitants, associations) | Contenus publiés : textes, photos, documents officiels |
| Réception des messages du formulaire de contact | Habitants et usagers | Nom, prénom, e-mail, téléphone, message, pièces jointes, réponse ; messages traités supprimés après la durée choisie par la commune (1 an par défaut, « jamais » possible) |
| Demandes d'exercice des droits RGPD | Habitants | Idem, nature de la demande, délai |
| Lettre d'information | Abonnés | Adresse e-mail, date d'inscription |
| Annuaire des associations | Contacts d'associations | Nom, e-mail, téléphone, adresse, fiche |
| Administration du site | Agents et élus | Nom, e-mail, rôle, connexions, journal d'activité (6 mois) |

### 1.3 Transferts hors de l'Union européenne

| Destinataire | Pays | Garanties |
|---|---|---|
| Netlify, Inc. (diffusion des sites publics) | États-Unis | Data Privacy Framework ; clauses contractuelles types |
| Plus Five Five, Inc. / Resend (envoi des e-mails, depuis l'Irlande) | États-Unis (données du compte) | Data Privacy Framework ; clauses contractuelles types |

### 1.4 Mesures de sécurité

Celles de l'annexe 2 de l'accord de sous-traitance (`sous-traitance-rgpd.md`) : cloisonnement strict
entre communes vérifié par des tests, HTTPS, mots de passe hachés, limitation des tentatives de
connexion, session en cookie HttpOnly, protection CSRF, sauvegardes quotidiennes chiffrées hors du
serveur (OVH, Paris, 90 jours), restauration testée, secrets hors du code.

### 1.5 Sous-traitants ultérieurs

OVH SAS (serveur et sauvegardes, France), Netlify, Inc., Plus Five Five, Inc. (Resend).

---

## Partie 2. Traitements dont Communeo est responsable (art. 30.1)

### 2.1 Relation avec les communes clientes : inscription, essai, devis, facturation

- **Finalité** : ouvrir le compte d'une commune, vérifier que la demande vient de la mairie, gérer l'essai,
  établir les devis, facturer, relancer, assister.
- **Base légale** : exécution du contrat (et mesures précontractuelles) ; obligation légale pour la
  facturation et la comptabilité.
- **Personnes** : demandeurs de l'inscription, administrateurs des communes, signataires des devis,
  contacts de facturation.
- **Données** : nom, prénom, e-mail, fonction, commune, adresse e-mail officielle de la mairie
  (Annuaire de l'administration), population INSEE, signataire et qualité, date, heure et adresse IP de
  la validation du devis, SIRET, adresse de facturation, factures et paiements.
- **Destinataires** : Communeo ; Chorus Pro (dépôt des factures) ; Resend (envoi des e-mails).
- **Durées** : compte tant que la commune est cliente, puis 6 mois ; demande d'inscription non
  confirmée : 30 jours (le lien de confirmation expire au bout de 7 jours ; supprimée automatiquement
  chaque nuit au-delà de 30 jours) ; devis, bons de commande et factures : 10 ans
  (code de commerce, art. L123-22).
- **Transferts hors UE** : Resend (voir 1.3).
- **Sécurité** : celle de la partie 1.

### 2.2 Formulaire de contact du site communeo.fr

- **Finalité** : répondre aux questions des mairies et des visiteurs.
- **Base légale** : consentement (case à cocher).
- **Personnes** : visiteurs du site qui écrivent.
- **Données** : nom et prénom, fonction, commune, e-mail, message ; adresse IP (limitation des envois,
  gardée en mémoire une heure, jamais enregistrée).
- **Destinataires** : Communeo ; Resend (transmission par e-mail).
- **Durée** : un an dans la boîte e-mail de Communeo ; rien n'est enregistré sur le serveur.
- **Transferts hors UE** : Resend (voir 1.3).

### 2.3 Journaux techniques et sécurité de la plateforme

- **Finalité** : sécurité, diagnostic des pannes, prévention des abus.
- **Base légale** : intérêt légitime.
- **Personnes** : utilisateurs de l'administration, visiteurs des sites.
- **Données** : adresse IP, date, page ou route demandée, code de réponse, tentatives de connexion.
- **Destinataires** : Communeo ; OVH et Netlify (hébergeurs).
- **Durée** : journaux des services limités en taille (3 fichiers de 10 Mo par service, les plus anciens
  effacés), soit de quelques jours à quelques semaines selon le trafic.

### 2.4 Surveillance de la disponibilité

- UptimeRobot interroge les pages techniques de santé (`/healthz`, `/api/health`) : aucune donnée
  personnelle. À mentionner seulement si ce service reçoit d'autres données (alertes par e-mail à
  Communeo uniquement).

---

## Mise à jour

À revoir à chaque nouveau prestataire, nouvelle fonction qui traite des données (par exemple
l'export des données, ticket #343), et au moins une fois par
an. Dernière mise à jour : 2 octobre 2026.
