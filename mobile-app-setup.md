# Application mobile — Guide de mise en production

Ce guide couvre tout ce qu'il reste a configurer apres l'implementation du code, jusqu'a la publication sur les stores.

---

## Table des matieres

1. [Pre-requis](#1-pre-requis)
2. [Firebase — Configuration du projet](#2-firebase--configuration-du-projet)
3. [Backend — Variable d'environnement](#3-backend--variable-denvironnement)
4. [Premiere app — Build manuel pas a pas](#4-premiere-app--build-manuel-pas-a-pas)
5. [Android — Signing et Google Play](#5-android--signing-et-google-play)
6. [iOS — Signing et App Store](#6-ios--signing-et-app-store)
7. [Assets graphiques par mairie](#7-assets-graphiques-par-mairie)
8. [Industrialisation — Onboarding d'une nouvelle mairie](#8-industrialisation--onboarding-dune-nouvelle-mairie)
9. [CI/CD — Automatisation avec GitHub Actions](#9-cicd--automatisation-avec-github-actions)
10. [Fiches store (listing)](#10-fiches-store-listing)
11. [Strategie de mises a jour](#11-strategie-de-mises-a-jour)
12. [Monitoring et incidents](#12-monitoring-et-incidents)
13. [Risque de rejet Apple — Plan B](#13-risque-de-rejet-apple--plan-b)

---

## 1. Pre-requis

### Comptes necessaires

| Compte | Cout | URL |
|--------|------|-----|
| Google Play Developer | 25 $ (une fois) | https://play.google.com/console |
| Apple Developer Program | 99 $/an | https://developer.apple.com/programs |
| Firebase (Spark gratuit suffit) | Gratuit | https://console.firebase.google.com |

### Outils a installer

```bash
# macOS requis pour iOS
# Node.js >= 18

# Android
brew install --cask android-studio
# Ouvrir Android Studio → SDK Manager → installer Android SDK 34+
# Ajouter au PATH :
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH

# iOS
xcode-select --install
# Ouvrir Xcode → Preferences → Accounts → ajouter Apple ID
# Installer CocoaPods si pas deja fait :
sudo gem install cocoapods

# Capacitor CLI (deja dans app/node_modules)
cd app && npm install

# Fastlane (optionnel mais recommande pour l'automatisation)
brew install fastlane
```

---

## 2. Firebase — Configuration du projet

### 2.1 Creer le projet Firebase

1. Aller sur https://console.firebase.google.com
2. **Ajouter un projet** → nom : `cms-mairies`
3. Desactiver Google Analytics (pas necessaire)
4. Attendre la creation du projet

### 2.2 Activer Cloud Messaging

1. Dans le projet → **Parametres du projet** (engrenage)
2. Onglet **Cloud Messaging**
3. Verifier que l'API Cloud Messaging (V1) est activee
   - Si "Cloud Messaging API (Legacy)" apparait comme desactivee, ignorer — on utilise V1

### 2.3 Generer le service account (pour le backend Strapi)

1. **Parametres du projet** → onglet **Comptes de service**
2. Cliquer **Generer une nouvelle cle privee**
3. Telecharger le fichier JSON
4. Ce fichier contient la cle privee — ne jamais le committer dans git

Le contenu de ce JSON sera mis dans la variable d'environnement `FIREBASE_SERVICE_ACCOUNT_JSON` (voir section 3).

### 2.4 Enregistrer les apps Firebase — pour chaque mairie

Pour chaque mairie (exemple : slug `lyon`, nom "Mairie de Lyon") :

**App Android :**
1. Page d'accueil du projet → **Ajouter une application** → Android
2. Nom du package : `fr.communeo.mairie.lyon`
3. Surnom : `Mairie de Lyon - Android`
4. Pas besoin du SHA-1 pour l'instant (necessaire plus tard pour Google Sign-In si besoin)
5. Telecharger `google-services.json`
6. Copier dans `app/firebase/configs/lyon/google-services.json`

**App iOS :**
1. **Ajouter une application** → iOS
2. ID du bundle : `fr.communeo.mairie.lyon`
3. Surnom : `Mairie de Lyon - iOS`
4. Telecharger `GoogleService-Info.plist`
5. Copier dans `app/firebase/configs/lyon/GoogleService-Info.plist`

**Structure resultante :**
```
app/firebase/configs/
├── lyon/
│   ├── google-services.json
│   └── GoogleService-Info.plist
├── marseille/
│   ├── google-services.json
│   └── GoogleService-Info.plist
└── ...
```

> Ces fichiers sont gitignored (contiennent des API keys Firebase). Les stocker dans un gestionnaire de secrets (1Password, Vault, etc.) ou dans les secrets GitHub Actions pour le CI/CD.

---

## 3. Backend — Variable d'environnement

### Sur le VPS de production

Le contenu du JSON de service account doit etre mis dans `FIREBASE_SERVICE_ACCOUNT_JSON`.

**Option 1 — Dans le fichier `.env` du backend :**
```bash
# Tout sur une seule ligne, guillemets simples pour echapper les guillemets internes
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"cms-mairies","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@cms-mairies.iam.gserviceaccount.com","client_id":"123456","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/..."}'
```

**Option 2 — Dans Docker Compose (si deploiement Docker) :**
```yaml
services:
  strapi:
    environment:
      - FIREBASE_SERVICE_ACCOUNT_JSON=${FIREBASE_SERVICE_ACCOUNT_JSON}
```

**Option 3 — Secret GitHub Actions (pour CI/CD) :**
- Nom du secret : `FIREBASE_SERVICE_ACCOUNT_JSON`
- Valeur : le contenu brut du JSON (sans guillemets externes)

### Verification

Apres redemarrage du backend, les logs doivent afficher :
```
✅ [FCM] Firebase Admin initialized
```

Si la variable n'est pas definie, le service s'initialise en mode degrade :
```
⚠️ [FCM] FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled
```
Le backend continue de fonctionner normalement, juste sans push.

---

## 4. Premiere app — Build manuel pas a pas

On prend l'exemple de la mairie de Lyon (slug : `lyon`).

### 4.1 Preparer les fichiers Firebase

```bash
# Verifier que les configs Firebase sont en place
ls app/firebase/configs/lyon/
# Doit afficher : google-services.json  GoogleService-Info.plist
```

### 4.2 Build Android

```bash
cd app

# Installer les dependances (si pas deja fait)
npm install

# Lancer le build
./scripts/build.sh lyon "Mairie de Lyon" android
```

Le script :
1. Verifie que `google-services.json` existe
2. Exporte `APP_SLUG=lyon` et `APP_NAME="Mairie de Lyon"` pour `capacitor.config.ts`
3. Ajoute la plateforme Android si absente (`npx cap add android`)
4. Copie `google-services.json` dans `android/app/`
5. Synchronise les plugins natifs (`npx cap sync android`)

Ensuite, ouvrir dans Android Studio :
```bash
npx cap open android
```

### 4.3 Build iOS

```bash
cd app

./scripts/build.sh lyon "Mairie de Lyon" ios
```

Puis ouvrir dans Xcode :
```bash
npx cap open ios
```

### 4.4 Tester sur device

**Android :**
- Brancher un telephone Android en USB (mode developpeur active)
- Android Studio → Run (triangle vert)
- Verifier : le site de la mairie s'affiche dans la WebView
- Aller sur `/notifications` → les toggles doivent apparaitre
- Activer "Actualites" → publier un article dans l'admin → la notification push arrive

**iOS :**
- Brancher un iPhone en USB
- Xcode → selectionner le device → Run
- Meme verification que ci-dessus
- Note : les push ne fonctionnent PAS sur le simulateur iOS, il faut un vrai device

---

## 5. Android — Signing et Google Play

### 5.1 Creer une keystore de signature

```bash
# Generer la keystore (une seule fois, a conserver precieusement)
keytool -genkey -v \
  -keystore app/android/communeo-release.keystore \
  -alias communeo \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Entrer les infos :
# - Mot de passe keystore (noter et sauvegarder !)
# - Prenom/Nom : Communeo
# - Organisation : Communeo
# - Pays : FR
```

> **CRITIQUE :** Sauvegarder la keystore ET le mot de passe en lieu sur (1Password, Vault). Si perdus, impossible de mettre a jour l'app sur le Play Store.

### 5.2 Configurer Gradle pour le signing

Editer `app/android/app/build.gradle`, ajouter dans `android {}` :

```groovy
signingConfigs {
    release {
        storeFile file('../communeo-release.keystore')
        storePassword System.getenv('KEYSTORE_PASSWORD') ?: ''
        keyAlias 'communeo'
        keyPassword System.getenv('KEY_PASSWORD') ?: ''
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### 5.3 Generer l'AAB (Android App Bundle)

```bash
cd app/android

# Definir les mots de passe
export KEYSTORE_PASSWORD="votre_mot_de_passe"
export KEY_PASSWORD="votre_mot_de_passe"

# Build release
./gradlew bundleRelease

# L'AAB se trouve dans :
# app/build/outputs/bundle/release/app-release.aab
```

### 5.4 Publier sur Google Play

1. Aller sur https://play.google.com/console
2. **Creer une application**
   - Nom : "Mairie de Lyon"
   - Langue : Francais
   - Type : Application
   - Gratuit
3. Remplir les sections obligatoires (voir section 10 pour le contenu)
4. **Production** → **Creer une version**
5. Uploader l'AAB
6. **Google Play App Signing** : accepter (Google gere la cle de signature en production, la keystore locale sert de cle d'upload)
7. Soumettre pour examen

Delai de review : **1 a 7 jours** (premiere app), puis generalement **quelques heures** pour les mises a jour.

---

## 6. iOS — Signing et App Store

### 6.1 Creer les identifiants Apple

1. Aller sur https://developer.apple.com/account
2. **Certificates, Identifiers & Profiles**

**App ID :**
1. **Identifiers** → **+** → **App IDs** → **App**
2. Description : `Mairie de Lyon`
3. Bundle ID (Explicit) : `fr.communeo.mairie.lyon`
4. Capabilities : cocher **Push Notifications**
5. Enregistrer

**Certificat de distribution :**
1. **Certificates** → **+** → **Apple Distribution**
2. Generer un CSR depuis Keychain Access (Trousseau d'acces) :
   - Trousseau → Assistant de certificat → Demander un certificat a une autorite...
   - Email : votre email
   - Enregistrer sur le disque
3. Uploader le CSR → Telecharger le certificat `.cer`
4. Double-cliquer pour l'installer dans le Trousseau

**Profil de provisioning :**
1. **Profiles** → **+** → **App Store Connect**
2. Selectionner l'App ID `fr.communeo.mairie.lyon`
3. Selectionner le certificat de distribution
4. Nom : `Mairie de Lyon - App Store`
5. Telecharger et double-cliquer pour installer

### 6.2 Configurer les Push Notifications iOS

1. **Keys** → **+**
2. Nom : `CMS Mairies APNs`
3. Cocher **Apple Push Notifications service (APNs)**
4. Telecharger la cle `.p8` (fichier unique, valable pour toutes les apps)
5. Noter le **Key ID** et le **Team ID**

**Relier la cle APNs a Firebase :**
1. Firebase Console → Parametres du projet → Cloud Messaging
2. Section **Apple app configuration**
3. Uploader la cle APNs `.p8`, renseigner le Key ID et le Team ID

> C'est ce qui permet a Firebase d'envoyer les push via APNs aux iPhones.

### 6.3 Configurer Xcode

Apres `npx cap open ios` :

1. **Signing & Capabilities** :
   - Team : selectionner votre Apple Developer Team
   - Bundle Identifier : `fr.communeo.mairie.lyon`
   - Signing Certificate : Distribution
   - Provisioning Profile : celui cree a l'etape 6.1
2. **+ Capability** → **Push Notifications** (si pas deja present)
3. **+ Capability** → **Background Modes** → cocher **Remote notifications**

### 6.4 Archiver et publier

**Depuis Xcode :**
1. **Product** → **Archive**
2. Organizer s'ouvre → selectionner l'archive
3. **Distribute App** → **App Store Connect** → **Upload**
4. Attendre le traitement (quelques minutes)

**Depuis App Store Connect :**
1. Aller sur https://appstoreconnect.apple.com
2. **Mes apps** → **+** → **Nouvelle app**
   - Nom : "Mairie de Lyon"
   - Bundle ID : `fr.communeo.mairie.lyon`
   - SKU : `mairie-lyon`
   - Acces complet
3. Remplir les informations (voir section 10)
4. **Build** → selectionner le build uploade
5. Soumettre pour examen

Delai de review : **1 a 3 jours** en general.

---

## 7. Assets graphiques par mairie

Chaque mairie a besoin de ses propres assets. Idealement, les generer a partir du **logo** et de la **couleur primaire** deja presents dans Strapi.

### Icone d'application

| Taille | Usage |
|--------|-------|
| 1024x1024 PNG | App Store / Play Store (source) |
| 512x512 PNG | Play Store listing |
| 192x192 PNG | Android adaptive icon |
| 180x180 PNG | iOS (iPhone) |

**Conseil :** Utiliser le favicon/logo de la mairie centre sur un fond de la couleur primaire du site. Pas de transparence pour iOS.

Placement :
- **Android :** `app/android/app/src/main/res/mipmap-*` (generer avec Android Studio → Image Asset)
- **iOS :** `app/ios/App/App/Assets.xcassets/AppIcon.appiconset/`

### Splash screen

Le splash screen Capacitor est configurable via le plugin `@capacitor/splash-screen` :
- Image centrale : logo de la mairie
- Fond : blanc ou couleur primaire
- Placement Android : `app/android/app/src/main/res/drawable/splash.png`
- Placement iOS : `app/ios/App/App/Assets.xcassets/Splash.imageset/`

> **Outil :** https://github.com/nicedoc/splash — genere les splash screens aux bonnes tailles.

### Screenshots pour les stores

5 screenshots minimum par format :
1. Page d'accueil du site
2. Page d'un article
3. Page des evenements
4. Page des notifications (toggles actives)
5. Notification push recue

| Format | Taille (px) |
|--------|-------------|
| iPhone 6.7" (requis) | 1290 x 2796 |
| iPhone 6.5" (requis) | 1284 x 2778 |
| iPad 12.9" (si universel) | 2048 x 2732 |
| Android phone | 1080 x 1920 minimum |
| Android tablet (optionnel) | 1200 x 1920 |

**Astuce pour industrialiser :** Prendre les screenshots une seule fois sur un device generique (en ouvrant le site de chaque mairie), puis cadrer avec un template de mockup.

---

## 8. Industrialisation — Onboarding d'une nouvelle mairie

Quand une nouvelle mairie rejoint la plateforme, voici le processus :

### 8.1 Fichier de registre `app/municipalities.json`

Creer un fichier central pour parametrer toutes les mairies :

```json
[
  {
    "slug": "lyon",
    "name": "Mairie de Lyon",
    "siteDocumentId": "abc123-def456-...",
    "appId": "fr.communeo.mairie.lyon",
    "androidVersionCode": 1,
    "iosVersion": "1.0.0"
  },
  {
    "slug": "marseille",
    "name": "Mairie de Marseille",
    "siteDocumentId": "xyz789-...",
    "appId": "fr.communeo.mairie.marseille",
    "androidVersionCode": 1,
    "iosVersion": "1.0.0"
  }
]
```

### 8.2 Checklist d'onboarding (par mairie)

```
[ ] 1. Site Strapi cree et deploye sur Netlify
[ ] 2. Firebase : app Android ajoutee (fr.communeo.mairie.{slug})
[ ] 3. Firebase : app iOS ajoutee (fr.communeo.mairie.{slug})
[ ] 4. google-services.json depose dans app/firebase/configs/{slug}/
[ ] 5. GoogleService-Info.plist depose dans app/firebase/configs/{slug}/
[ ] 6. municipalities.json mis a jour
[ ] 7. Icone 1024x1024 fournie (ou generee depuis le logo Strapi)
[ ] 8. Build Android : ./scripts/build.sh {slug} "{name}" android
[ ] 9. Build iOS : ./scripts/build.sh {slug} "{name}" ios
[ ] 10. Apple Developer : App ID + Provisioning Profile crees
[ ] 11. Android : AAB uploade sur Google Play Console
[ ] 12. iOS : archive uploadee sur App Store Connect
[ ] 13. Fiches store remplies (description, screenshots, etc.)
[ ] 14. Soumis pour review sur les deux stores
[ ] 15. Publication validee
```

### 8.3 Script d'onboarding automatise (futur)

A terme, un script `app/scripts/onboard.sh` pourrait :

```bash
#!/bin/bash
# Usage: ./scripts/onboard.sh <slug> <name> <siteDocumentId>
# 1. Ajouter les apps Firebase via firebase CLI
# 2. Telecharger les google-services.json / GoogleService-Info.plist
# 3. Ajouter l'entree dans municipalities.json
# 4. Generer l'icone depuis le logo Strapi (via ImageMagick/sharp)
# 5. Builder les deux plateformes
# 6. Uploader via Fastlane
```

La Firebase CLI permet de creer des apps par commande :
```bash
firebase apps:create ANDROID fr.communeo.mairie.lyon --project cms-mairies
firebase apps:sdkconfig ANDROID <appId> --project cms-mairies > app/firebase/configs/lyon/google-services.json

firebase apps:create IOS fr.communeo.mairie.lyon --project cms-mairies
firebase apps:sdkconfig IOS <appId> --project cms-mairies > app/firebase/configs/lyon/GoogleService-Info.plist
```

---

## 9. CI/CD — Automatisation avec GitHub Actions

Le repo a deja un workflow `deploy.yml` pour le backend. On peut ajouter un workflow dedie aux apps mobiles.

### 9.1 Secrets a configurer dans GitHub

| Secret | Description |
|--------|-------------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON du service account Firebase |
| `ANDROID_KEYSTORE_BASE64` | Keystore encodee en base64 (`base64 < communeo-release.keystore`) |
| `ANDROID_KEYSTORE_PASSWORD` | Mot de passe de la keystore |
| `ANDROID_KEY_PASSWORD` | Mot de passe de la cle |
| `PLAY_STORE_SERVICE_ACCOUNT_JSON` | JSON du service account Google Play (pour Fastlane) |
| `APP_STORE_CONNECT_API_KEY` | Cle API App Store Connect (pour Fastlane) |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID App Store Connect |
| `APP_STORE_CONNECT_KEY_ID` | Key ID App Store Connect |
| `MATCH_PASSWORD` | Mot de passe pour Fastlane Match (signing iOS) |

### 9.2 Workflow Android — `.github/workflows/build-android.yml`

```yaml
name: Build Android App

on:
  workflow_dispatch:
    inputs:
      slug:
        description: 'Municipality slug (e.g. lyon)'
        required: true
      name:
        description: 'App name (e.g. Mairie de Lyon)'
        required: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Install dependencies
        run: cd app && npm ci

      - name: Decode keystore
        run: echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > app/android/communeo-release.keystore

      - name: Copy Firebase config
        run: |
          mkdir -p app/firebase/configs/${{ inputs.slug }}
          # Les configs Firebase doivent etre stockees en secrets ou dans un bucket prive
          # Alternative : les committer chiffres avec git-crypt

      - name: Build
        env:
          APP_SLUG: ${{ inputs.slug }}
          APP_NAME: ${{ inputs.name }}
          KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          cd app
          ./scripts/build.sh ${{ inputs.slug }} "${{ inputs.name }}" android
          cd android && ./gradlew bundleRelease

      - name: Upload AAB
        uses: actions/upload-artifact@v4
        with:
          name: app-release-${{ inputs.slug }}
          path: app/android/app/build/outputs/bundle/release/app-release.aab
```

### 9.3 Upload automatique vers les stores avec Fastlane

**Fastlane pour Android — `app/android/fastlane/Fastfile` :**

```ruby
default_platform(:android)

platform :android do
  desc "Upload to Google Play internal track"
  lane :deploy do
    upload_to_play_store(
      track: 'internal',  # internal → alpha → beta → production
      aab: 'app/build/outputs/bundle/release/app-release.aab',
      json_key_data: ENV['PLAY_STORE_SERVICE_ACCOUNT_JSON'],
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true,
    )
  end
end
```

**Fastlane pour iOS — `app/ios/fastlane/Fastfile` :**

```ruby
default_platform(:ios)

platform :ios do
  desc "Upload to App Store Connect (TestFlight)"
  lane :deploy do
    api_key = app_store_connect_api_key(
      key_id: ENV['APP_STORE_CONNECT_KEY_ID'],
      issuer_id: ENV['APP_STORE_CONNECT_ISSUER_ID'],
      key_content: ENV['APP_STORE_CONNECT_API_KEY'],
    )
    build_app(
      workspace: 'App.xcworkspace',
      scheme: 'App',
      export_method: 'app-store',
    )
    upload_to_testflight(api_key: api_key)
  end
end
```

### 9.4 Stockage des configs Firebase

Les `google-services.json` et `GoogleService-Info.plist` contiennent des API keys mais pas de secrets critiques (ce sont des identifiants publics). Deux options :

1. **Les committer chiffres** avec `git-crypt` (recommande si plusieurs devs)
2. **Les stocker dans GitHub Secrets** et les injecter au build (un secret par mairie, plus lourd a gerer)

---

## 10. Fiches store (listing)

### Description type (a adapter par mairie)

**Titre :** Mairie de {Nom}

**Description courte (80 car.):**
> L'application officielle de la Mairie de {Nom}.

**Description longue :**
> Restez connecte avec votre mairie ! L'application officielle de la Mairie de {Nom} vous permet de :
>
> - Consulter les actualites et informations de votre commune
> - Decouvrir les evenements a venir
> - Etre alerte en temps reel des perturbations (travaux, coupures, intemperies)
> - Suivre les menus de la cantine scolaire
> - Connaitre les jours de collecte des dechets
> - Acceder aux demarches administratives
> - Trouver les informations pratiques (horaires, contacts, equipe municipale)
>
> Activez les notifications push pour ne rien manquer !
>
> Developpee par Communeo.

### Informations obligatoires

| Champ | Valeur |
|-------|--------|
| Categorie | Google Play : `Government` / App Store : `Reference` ou `News` |
| Politique de confidentialite | URL de la page `/politique-confidentialite` du site de la mairie |
| Site web | URL du site Netlify de la mairie |
| Email de support | contact mail de la mairie (depuis Strapi) |
| Classification du contenu | Tout public / PEGI 3 / 4+ |
| Pays | France |
| Langue | Francais |

### Questionnaire de securite des donnees (Google Play)

| Question | Reponse |
|----------|---------|
| Collecte de donnees personnelles ? | Non (pas de compte utilisateur, pas de tracking) |
| Partage de donnees avec des tiers ? | Non |
| Donnees chiffrees en transit ? | Oui (HTTPS) |
| Possibilite de supprimer ses donnees ? | N/A (aucune donnee collectee) |
| Conformite RGPD ? | Oui (mentions dans la politique de confidentialite) |

### Questionnaire App Privacy (Apple)

| Data Type | Collected? |
|-----------|------------|
| Contact Info | No |
| Health & Fitness | No |
| Financial Info | No |
| Location | No |
| Sensitive Info | No |
| Contacts | No |
| User Content | No |
| Browsing History | No |
| Search History | No |
| Identifiers | No |
| Purchases | No |
| Usage Data | No |
| Diagnostics | No |

> Reponse honnete : l'app ne collecte rien. Le site web charge dans la WebView peut utiliser des cookies (mentionnes dans la banniere cookies), mais l'app native elle-meme n'a aucun tracking.

---

## 11. Strategie de mises a jour

### Ce qui ne necessite PAS de mise a jour de l'app

- Nouveau contenu (articles, evenements, alertes)
- Modification du design ou des pages du site Astro
- Ajout de nouvelles pages au site
- Modification des couleurs ou du logo dans Strapi

Tout cela est servi par Netlify et se met a jour automatiquement dans la WebView.

### Ce qui necessite une mise a jour de l'app

- Mise a jour des plugins Capacitor (push, preferences)
- Ajout d'un nouveau type de notification (nouveau topic)
- Modification du splash screen ou de l'icone
- Correction d'un bug natif
- Mise a jour de securite Android/iOS

### Processus de mise a jour

1. Modifier le code dans `app/`
2. Incrementer la version dans `app/package.json`
3. Pour chaque mairie :
   ```bash
   ./scripts/build.sh {slug} "{name}" android
   ./scripts/build.sh {slug} "{name}" ios
   ```
4. Uploader sur les stores (ou via Fastlane)
5. Soumettre pour review

> Les mises a jour passent en general en review beaucoup plus vite que la premiere publication.

### Versioning

Convention recommandee :
- `versionName` / `CFBundleShortVersionString` : semver `1.0.0`, `1.1.0`, etc.
- `versionCode` (Android) : entier incremental `1`, `2`, `3`...
- Meme version pour toutes les mairies (c'est le meme code natif)

---

## 12. Monitoring et incidents

### Firebase Console

- **Cloud Messaging** → onglet **Reports** : nombre de messages envoyes, taux de livraison
- **Crashlytics** (optionnel, a activer) : crash reports natifs
- **Performance** (optionnel) : temps de chargement

### Logs backend

Le service FCM log chaque envoi :
```
📤 [FCM] Sent to topic "abc123-articles": projects/cms-mairies/messages/...
❌ [FCM] Failed to send to topic "abc123-articles": ...
```

Surveiller ces logs pour detecter les erreurs d'envoi.

### Incidents courants

| Probleme | Cause probable | Solution |
|----------|----------------|----------|
| Notifications non recues | Token FCM expire ou device offline | Normal, FCM retente. Verifier que le topic est correct |
| `FIREBASE_SERVICE_ACCOUNT_JSON not set` | Variable d'env manquante apres redeploy | Remettre la variable dans `.env` ou Docker |
| Erreur "Sender ID mismatch" | `google-services.json` ne correspond pas au projet Firebase | Re-telecharger depuis la bonne app Firebase |
| App rejetee par Apple | "Minimum functionality" | Voir section 13 (Plan B) |
| WebView affiche une page blanche | Site Netlify en erreur ou DNS non propage | Verifier le deploy Netlify |

---

## 13. Risque de rejet Apple — Plan B

Apple peut rejeter les apps WebView wrapper sous la guideline **4.2 Minimum Functionality**.

### Mitigations en place

1. **Push notifications** : fonctionnalite native reelle, pas disponible dans Safari
2. **Ecran de preferences** : interaction native (toggles, stockage local)
3. **Branding unique** : chaque app a son nom, icone, couleurs
4. **Contenu different** : chaque app affiche un site different (mairie differente)

### Si rejet malgre tout

**Plan B : App unique multi-mairie**

Transformer en une app unique "Communeo" avec :
1. Ecran d'accueil : selecteur de mairie (liste ou recherche par code postal)
2. Choix sauvegarde dans `Preferences`
3. WebView charge le site de la mairie selectionnee
4. Les topics FCM fonctionnent de la meme maniere

Avantages :
- Une seule app a maintenir sur les stores
- Review Apple une seule fois
- Ajout de nouvelles mairies sans passer par les stores

Inconvenients :
- Perte du branding individuel (icone, nom)
- UX legerement moins directe (etape de selection)

### Calendrier recommande

1. **Commencer par soumettre 1-2 apps individuelles** (les plus grosses mairies)
2. Si acceptees → continuer le modele une app par mairie
3. Si rejetees → pivoter vers l'app unique, ce qui necessite :
   - Modifier `capacitor.config.ts` pour ne pas pre-definir `server.url`
   - Ajouter un ecran de selection natif (composant Preact dans `www/index.html`)
   - Le `server.url` est alors defini dynamiquement apres selection

---

## Resume — Ordre des operations

```
1. Creer le projet Firebase                          (30 min)
2. Generer le service account + configurer backend   (15 min)
3. Tester les push en local (backend dev)            (30 min)
4. Creer les comptes Google Play + Apple Developer   (1-2 jours de validation)
5. Preparer les assets de la premiere mairie         (1-2h)
6. Build + test Android sur device                   (1h)
7. Build + test iOS sur device                       (1h)
8. Remplir les fiches store                          (1h par store)
9. Soumettre pour review                             (1-7 jours d'attente)
10. Publication !
11. Industrialiser (Fastlane, CI/CD, onboard.sh)     (apres la premiere mairie)
```
