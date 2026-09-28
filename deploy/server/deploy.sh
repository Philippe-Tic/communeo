#!/usr/bin/env bash
# Sur le serveur, dans le dossier de docker-compose.yml et du .env (voir DEPLOYMENT.md) :
#   ./deploy.sh <version>      récupère les images de cette version (commit), redémarre, vérifie
#   ./deploy.sh rollback       revient à la version précédente
#   ./deploy.sh restart        relance la version en ligne (après une modification du .env)
# Si Strapi ou nginx ne sont pas sains après le redémarrage, la version précédente est remise en place.
#
# La version en ligne est aussi écrite dans le .env (IMAGE_TAG) : un simple `docker compose up -d`
# relance cette version, jamais une ancienne image « latest » restée sur le serveur.
set -euo pipefail
cd "$(dirname "$0")"

current=$(cat .deployed-tag 2>/dev/null || true)
previous=$(cat .previous-tag 2>/dev/null || true)
tag=${1:?"Usage : ./deploy.sh <version>|rollback|restart"}
if [ "$tag" = rollback ]; then
  [ -n "$previous" ] || { echo "Aucune version précédente connue"; exit 1; }
  tag=$previous
elif [ "$tag" = restart ]; then
  [ -n "$current" ] || { echo "Aucune version en ligne connue : ./deploy.sh <version>"; exit 1; }
  tag=$current
fi

# IMAGE_TAG du .env : ligne remplacée (ou ajoutée), permissions du fichier conservées
remember() {
  touch .env
  if grep -q '^IMAGE_TAG=' .env; then
    # Réécrit le même fichier (mêmes droits) ; la copie de travail n'est lisible que par nous
    (umask 077 && awk -v tag="$1" '/^IMAGE_TAG=/ { print "IMAGE_TAG=" tag; next } { print }' .env > .env.tmp)
    cat .env.tmp > .env && rm -f .env.tmp
  else
    printf '\n# Version en ligne, tenue à jour par deploy.sh\nIMAGE_TAG=%s\n' "$1" >> .env
  fi
}

healthy() {
  local deadline=$((SECONDS + 300))
  for service in strapi nginx; do
    until [ "$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q "$service")" 2>/dev/null)" = healthy ]; do
      [ $SECONDS -lt $deadline ] || { echo "✗ $service n'est pas sain"; return 1; }
      sleep 5
    done
  done
}

echo "▸ Version $tag (actuelle : ${current:-aucune})"
IMAGE_TAG=$tag docker compose pull --quiet
IMAGE_TAG=$tag docker compose up -d --remove-orphans

if ! healthy; then
  docker compose logs --tail 100 strapi nginx || true
  if [ -n "$current" ] && [ "$current" != "$tag" ]; then
    echo "▸ Retour à la version $current"
    IMAGE_TAG=$current docker compose up -d --remove-orphans
    remember "$current"
  fi
  exit 1
fi
remember "$tag"

if [ "$current" != "$tag" ]; then
  [ -n "$current" ] && echo "$current" > .previous-tag
  echo "$tag" > .deployed-tag
fi
docker image prune -f >/dev/null
echo "✓ Version $tag en ligne"
