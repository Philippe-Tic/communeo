#!/usr/bin/env bash
set -euo pipefail

# Build script for a municipality's mobile app.
# Usage: ./scripts/build.sh <slug> <appName> <platform>
#
# Prerequisites:
#   - Firebase config files in firebase/configs/<slug>/
#     - google-services.json  (Android)
#     - GoogleService-Info.plist  (iOS)
#   - npm install already run in this directory
#
# Example:
#   ./scripts/build.sh lyon "Mairie de Lyon" android

SLUG="${1:?Usage: $0 <slug> <appName> <platform>}"
APP_NAME="${2:?Usage: $0 <slug> <appName> <platform>}"
PLATFORM="${3:?Usage: $0 <slug> <appName> <platform>}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
FIREBASE_DIR="$PROJECT_DIR/firebase/configs/$SLUG"

echo "==> Building app for: $SLUG ($APP_NAME) — platform: $PLATFORM"

# Validate Firebase config exists
if [ "$PLATFORM" = "android" ] && [ ! -f "$FIREBASE_DIR/google-services.json" ]; then
  echo "ERROR: Missing $FIREBASE_DIR/google-services.json"
  exit 1
fi
if [ "$PLATFORM" = "ios" ] && [ ! -f "$FIREBASE_DIR/GoogleService-Info.plist" ]; then
  echo "ERROR: Missing $FIREBASE_DIR/GoogleService-Info.plist"
  exit 1
fi

# Export env vars for capacitor.config.ts
export APP_SLUG="$SLUG"
export APP_NAME="$APP_NAME"

# Add native platform if not already present
if [ ! -d "$PROJECT_DIR/$PLATFORM" ]; then
  echo "==> Adding $PLATFORM platform..."
  npx cap add "$PLATFORM"
fi

# Copy Firebase config files
if [ "$PLATFORM" = "android" ]; then
  mkdir -p "$PROJECT_DIR/android/app"
  cp "$FIREBASE_DIR/google-services.json" "$PROJECT_DIR/android/app/google-services.json"
  echo "==> Copied google-services.json"
fi

if [ "$PLATFORM" = "ios" ]; then
  # Find the App directory inside the iOS project
  IOS_APP_DIR=$(find "$PROJECT_DIR/ios" -name "App" -type d -maxdepth 2 | head -1)
  if [ -n "$IOS_APP_DIR" ]; then
    cp "$FIREBASE_DIR/GoogleService-Info.plist" "$IOS_APP_DIR/GoogleService-Info.plist"
    echo "==> Copied GoogleService-Info.plist"
  else
    echo "WARNING: Could not find iOS App directory"
  fi
fi

# Sync web assets and native plugins
echo "==> Running cap sync..."
npx cap sync "$PLATFORM"

echo ""
echo "==> Done! Open the native project to build:"
if [ "$PLATFORM" = "android" ]; then
  echo "    npx cap open android"
  echo "    (or: cd android && ./gradlew assembleRelease)"
fi
if [ "$PLATFORM" = "ios" ]; then
  echo "    npx cap open ios"
  echo "    (then build from Xcode)"
fi
