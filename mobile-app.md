# Application mobile - Plan de developpement

## Vue d'ensemble

Application mobile Capacitor qui affiche le site web de la mairie dans une WebView native, avec push notifications Firebase (FCM) et ecran de preferences.

**Stack :** Capacitor + Firebase Cloud Messaging
**Modele :** Une app par mairie (build parametre par slug)
**Offline :** Non (connexion requise)

---

## Architecture

```
┌──────────────────────────────────┐
│  App Capacitor (app/)            │
│  WebView → {slug}-mairie.netlify │
│  + Push Notifications plugin     │
│  + Ecran preferences notifs      │
└──────────────┬───────────────────┘
               │ FCM topics
┌──────────────┴───────────────────┐
│  Backend Strapi (backend/)       │
│  + firebase-admin SDK            │
│  + push-notification.ts service  │
│  Document middleware → FCM send  │
└──────────────────────────────────┘
```

**Principe :** Quand un contenu est publie dans l'admin, Strapi envoie un message FCM sur un topic. Les appareils abonnes a ce topic recoivent la notification push.

**Topics FCM :**
- `{siteDocumentId}-articles` — Actualites
- `{siteDocumentId}-evenements` — Evenements
- `{siteDocumentId}-alertes` — Alertes
- `{siteDocumentId}-school-menus` — Menus cantine
- `{siteDocumentId}-waste-schedules` — Collecte dechets

L'abonnement/desabonnement aux topics se fait cote client (SDK FCM dans l'app). Aucun endpoint Strapi supplementaire n'est necessaire.

---

## Etape 1 : Projet Firebase

### 1.1 Creer le projet Firebase

1. Aller sur [Firebase Console](https://console.firebase.google.com)
2. Creer un projet `cms-mairies` (un seul projet pour toutes les mairies)
3. Activer **Cloud Messaging** dans les parametres du projet

### 1.2 Generer le service account (pour le backend)

1. Firebase Console → Parametres du projet → Comptes de service
2. Generer une nouvelle cle privee (JSON)
3. Stocker le contenu JSON dans la variable d'environnement `FIREBASE_SERVICE_ACCOUNT_JSON` du backend

### 1.3 Creer les apps Firebase (pour chaque mairie)

Pour chaque mairie (ex: `lyon`) :
1. Ajouter une app Android : package `fr.communeo.mairie.lyon`
2. Ajouter une app iOS : bundle ID `fr.communeo.mairie.lyon`
3. Telecharger `google-services.json` (Android) et `GoogleService-Info.plist` (iOS)
4. Stocker dans `app/firebase/configs/lyon/`

---

## Etape 2 : Backend — Integration FCM

### 2.1 Installation

```bash
cd backend
npm install firebase-admin
```

### 2.2 Nouveau service `backend/src/services/fcm.ts`

Service singleton (meme pattern que `auto-deploy.ts`) :
- Initialise `firebase-admin` avec `FIREBASE_SERVICE_ACCOUNT_JSON`
- Expose `sendToTopic(topic, { title, body, data })` qui appelle `admin.messaging().send()`
- Logs et gestion d'erreurs

### 2.3 Nouveau service `backend/src/services/push-notification.ts`

Logique de decision — quand envoyer une notification :

| Content type | Declencheur |
|---|---|
| Article | `status` passe a `published` (creation ou mise a jour) |
| Evenement | Creation uniquement (pas de champ status) |
| Alerte | `active` passe a `true` |
| Menu cantine | Creation uniquement |
| Collecte dechets | Creation uniquement |

Les mises a jour simples (correction de typo, etc.) ne declenchent pas de notification.
Seule la **premiere publication** notifie.

### 2.4 Modification de `backend/src/index.ts`

Le document middleware existant (qui gere deja l'auto-deploy) est etendu :
- Pour les content types notifiables : recuperer l'etat precedent **avant** `await next()` (pour detecter les transitions draft→published, inactive→active)
- Apres `next()` : appeler `pushNotificationService.notifyIfNeeded()` en plus de `autoDeployService.scheduleDeployIfEnabled()`

### 2.5 Variable d'environnement

Ajouter dans `.env` et en production :
```
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"..."}
```

---

## Etape 3 : Sites Astro — Page de preferences

### 3.1 Nouveau composant `sites/src/components/NotificationPreferences.tsx`

Composant Preact (meme pattern que `WeatherWidget.tsx` — island `client:load`) :
- Detecte `window.Capacitor` pour savoir si on est dans l'app
- **Dans l'app :** affiche 5 toggles (un par type de contenu)
  - Toggle ON → `PushNotifications.subscribeToTopic('{siteDocumentId}-articles')`
  - Toggle OFF → `PushNotifications.unsubscribeFromTopic(...)`
  - Preferences stockees localement via `Capacitor.Plugins.Preferences`
- **Dans le navigateur :** affiche un message "Telechargez l'application pour recevoir les notifications"

### 3.2 Nouvelle page `sites/src/pages/notifications.astro`

Page avec le composant Preact, recevant `SITE_DOCUMENT_ID` en prop.

### 3.3 Modification de `sites/src/layouts/Layout.astro`

Script en fin de `<body>` :
- Detecte `window.Capacitor`
- Si present : initialise le listener de push (tap sur notification → navigation vers la page correspondante, ex: `/actualites` pour un article)
- Ajoute un lien vers `/notifications` accessible depuis le footer ou le menu

---

## Etape 4 : Projet Capacitor

### 4.1 Structure

```
app/
├── package.json
├── capacitor.config.ts
├── www/
│   └── index.html               # Fallback minimal (spinner de chargement)
├── scripts/
│   └── build.sh                 # Build parametre par slug/mairie
├── firebase/
│   └── configs/
│       ├── lyon/
│       │   ├── google-services.json
│       │   └── GoogleService-Info.plist
│       └── marseille/
│           ├── ...
├── android/                     # npx cap add android
└── ios/                         # npx cap add ios
```

### 4.2 Initialisation

```bash
mkdir app && cd app
npm init -y
npm install @capacitor/core @capacitor/cli
npm install @capacitor/push-notifications @capacitor/splash-screen @capacitor/status-bar
npx cap init "Mairie" "fr.communeo.mairie" --web-dir www
npx cap add android
npx cap add ios
```

### 4.3 Configuration — `capacitor.config.ts`

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.communeo.mairie.SLUG',          // Remplace par le slug de la mairie
  appName: 'Mairie de NOM',                  // Remplace par le nom de la mairie
  webDir: 'www',
  server: {
    url: 'https://SLUG-mairie.netlify.app',  // Charge le site distant dans la WebView
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
```

Le parametre `server.url` fait que la WebView charge directement le site Netlify. Capacitor injecte automatiquement son bridge JS, rendant les plugins natifs (push, preferences) accessibles depuis le code du site Astro.

### 4.4 Script de build — `app/scripts/build.sh`

```bash
#!/bin/bash
# Usage: ./scripts/build.sh <slug> <nom> <platform>
# Exemple: ./scripts/build.sh lyon "Mairie de Lyon" android

SLUG=$1
NAME=$2
PLATFORM=$3  # android | ios

# 1. Generer capacitor.config.ts depuis le template
sed -e "s/SLUG_PLACEHOLDER/$SLUG/g" \
    -e "s/NAME_PLACEHOLDER/$NAME/g" \
    capacitor.config.template.ts > capacitor.config.ts

# 2. Copier les fichiers Firebase de la mairie
if [ "$PLATFORM" = "android" ]; then
  cp "firebase/configs/$SLUG/google-services.json" android/app/google-services.json
elif [ "$PLATFORM" = "ios" ]; then
  cp "firebase/configs/$SLUG/GoogleService-Info.plist" ios/App/App/GoogleService-Info.plist
fi

# 3. Sync Capacitor
npx cap sync $PLATFORM

# 4. Build
if [ "$PLATFORM" = "android" ]; then
  cd android && ./gradlew assembleRelease
elif [ "$PLATFORM" = "ios" ]; then
  cd ios && xcodebuild -workspace App.xcworkspace -scheme App -configuration Release archive
fi
```

---

## Etape 5 : Publication sur les stores

### 5.1 Prerequis

| Store | Compte | Cout |
|---|---|---|
| Google Play | Google Play Developer | 25$ (une fois) |
| Apple App Store | Apple Developer Program | 99$/an |

### 5.2 Assets a preparer (par mairie)

- **Icone** : 1024x1024 PNG (utiliser le logo/favicon de la mairie)
- **Splash screen** : image avec logo centre sur fond blanc
- **Screenshots** : 3-5 captures d'ecran sur iPhone et Android (page d'accueil, actualites, notifications, preferences)
- **Description** : texte de presentation (ex: "L'application officielle de la Mairie de Lyon. Consultez les actualites, evenements et informations pratiques. Recevez des notifications pour les alertes et nouveaux contenus.")
- **Categorie** : "Government" / "Actualites et magazines"

### 5.3 Google Play — Publication

1. Creer l'app dans la [Google Play Console](https://play.google.com/console)
   - Package : `fr.communeo.mairie.{slug}`
   - Nom : "Mairie de {Nom}"
2. Remplir la fiche store (description, screenshots, categorie, politique de confidentialite)
3. Generer l'APK/AAB signe :
   ```bash
   cd app
   ./scripts/build.sh lyon "Mairie de Lyon" android
   # L'AAB est dans android/app/build/outputs/bundle/release/
   ```
4. Uploader l'AAB dans la Play Console
5. Soumettre pour review (generalement 1-3 jours)

**Mises a jour :** Pas besoin de republier l'app quand le contenu change (le site se met a jour via Netlify). Republier uniquement si on modifie le code natif ou les plugins Capacitor.

### 5.4 Apple App Store — Publication

1. Creer l'app dans [App Store Connect](https://appstoreconnect.apple.com)
   - Bundle ID : `fr.communeo.mairie.{slug}`
   - Nom : "Mairie de {Nom}"
2. Remplir la fiche store (description, screenshots, categorie, politique de confidentialite)
3. Builder et archiver via Xcode :
   ```bash
   cd app
   ./scripts/build.sh lyon "Mairie de Lyon" ios
   # Puis ouvrir ios/App/App.xcworkspace dans Xcode
   # Product → Archive → Distribute App → App Store Connect
   ```
4. Ou utiliser `xcrun altool` / Transporter pour uploader depuis le terminal
5. Soumettre pour review (generalement 1-7 jours)

**Point d'attention Apple :** Apple rejette parfois les apps qui ne sont "qu'un site web". Nos push notifications + preferences de notification constituent une fonctionnalite native suffisante. Si rejet malgre tout : plan B = app unique avec selecteur de mairie au premier lancement.

### 5.5 Automatisation future (optionnel)

Pour simplifier la publication de nouvelles mairies :
- **Fastlane** : automatise le build, signing, et upload vers les stores
- **GitHub Actions** : CI/CD pour builder automatiquement quand une nouvelle mairie est ajoutee
- Config par mairie dans un fichier JSON (`app/municipalities.json`) avec slug, nom, siteDocumentId

---

## Resume des fichiers

### Fichiers existants modifies

| Fichier | Modification |
|---|---|
| `backend/src/index.ts` | Ajout appel push notification dans le document middleware |
| `backend/package.json` | Ajout `firebase-admin` |
| `sites/src/layouts/Layout.astro` | Script detection Capacitor + listener push |
| `sites/package.json` | Ajout deps Capacitor (plugins JS pour le bridge) |

### Nouveaux fichiers

| Fichier | Description |
|---|---|
| `backend/src/services/fcm.ts` | Service Firebase Cloud Messaging |
| `backend/src/services/push-notification.ts` | Logique de decision des notifications |
| `sites/src/components/NotificationPreferences.tsx` | Composant Preact preferences notifs |
| `sites/src/pages/notifications.astro` | Page preferences notifications |
| `app/` (dossier complet) | Projet Capacitor |

---

## Verification

1. **Backend :** Publier un article via l'admin → logs Strapi montrent l'envoi FCM → notification visible dans la console Firebase
2. **Site web :** `/notifications` affiche "Telechargez l'app" dans le navigateur
3. **App Android :** Installer → le site s'affiche → aller sur `/notifications` → les toggles apparaissent → activer "Actualites" → publier un article → notification recue
4. **App iOS :** Idem Android
5. **Preferences :** Desactiver un type → publier du contenu de ce type → pas de notification
