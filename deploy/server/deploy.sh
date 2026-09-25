#!/usr/bin/env bash
# Sur le serveur, dans le dossier de docker-compose.yml et du .env (voir DEPLOYMENT.md) :
#   ./deploy.sh <version>      récupère les images de cette version (commit), redémarre, vérifie
#   ./deploy.sh rollback       revient à la version précédente
# Si Strapi ou nginx ne sont pas sains après le redémarrage, la version précédente est remise en place.
set -euo pipefail
cd "$(dirname "$0")"

current=$(cat .deployed-tag 2>/dev/null || true)
previous=$(cat .previous-tag 2>/dev/null || true)
tag=${1:?"Usage : ./deploy.sh <version>|rollback"}
if [ "$tag" = rollback ]; then
  [ -n "$previous" ] || { echo "Aucune version précédente connue"; exit 1; }
  tag=$previous
fi

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
  fi
  exit 1
fi

if [ "$current" != "$tag" ]; then
  [ -n "$current" ] && echo "$current" > .previous-tag
  echo "$tag" > .deployed-tag
fi
docker image prune -f >/dev/null
echo "✓ Version $tag en ligne"
