#!/usr/bin/env bash
# Sur le serveur, dans le dossier de docker-compose.yml et du .env (voir DEPLOYMENT.md) :
#   ./deploy.sh <version>      récupère les images de cette version (commit), redémarre, vérifie
#   ./deploy.sh rollback       revient à la version précédente
#   ./deploy.sh restart        relance la version en ligne (après une modification du .env)
# Si Strapi ou Caddy ne sont pas sains après le redémarrage, la version précédente est remise en place,
# avec son docker-compose.yml (une version peut changer les services, ex. nginx → caddy, #381) : copie
# gardée à chaque déploiement réussi (.deployed-compose.yml, .previous-compose.yml), sinon celle du dépôt.
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

# docker-compose.yml d'une version déjà déployée : copie gardée, sinon celui du dépôt public (GitHub)
compose_of() {
  local version=$1
  if [ "$version" = "$current" ] && [ -f .deployed-compose.yml ]; then
    cp .deployed-compose.yml ".compose-$version.yml"
  elif [ "$version" = "$previous" ] && [ -f .previous-compose.yml ]; then
    cp .previous-compose.yml ".compose-$version.yml"
  elif ! curl -fsSL --max-time 30 -o ".compose-$version.yml" \
    "https://raw.githubusercontent.com/Philippe-Tic/communeo/$version/docker-compose.yml" 2>/dev/null; then
    rm -f ".compose-$version.yml"
    return 1
  fi
  echo ".compose-$version.yml"
}

healthy() {
  local deadline=$((SECONDS + ${DEPLOY_HEALTH_TIMEOUT:-300}))
  for service in strapi caddy; do
    until [ "$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q "$service")" 2>/dev/null)" = healthy ]; do
      [ $SECONDS -lt $deadline ] || { echo "✗ $service n'est pas sain"; return 1; }
      sleep 5
    done
  done
}

# Retour à la version de départ, avec son docker-compose.yml
restore() {
  [ -n "$current" ] && [ "$current" != "$tag" ] || return 0
  echo "▸ Retour à la version $current"
  local file
  if file=$(compose_of "$current"); then
    mv "$file" docker-compose.yml
  else
    echo "  docker-compose.yml de la version $current introuvable : celui de la version $tag est gardé"
  fi
  IMAGE_TAG=$current docker compose up -d --remove-orphans
  remember "$current"
}

if [ "${1}" = rollback ]; then
  file=$(compose_of "$tag") || { echo "docker-compose.yml de la version $tag introuvable"; exit 1; }
  mv "$file" docker-compose.yml
fi

echo "▸ Version $tag (actuelle : ${current:-aucune})"
IMAGE_TAG=$tag docker compose pull --quiet
# Un changement de services (ex. nginx → caddy) libère les ports avant de démarrer les nouveaux
if ! IMAGE_TAG=$tag docker compose up -d --remove-orphans || ! healthy; then
  docker compose logs --tail 100 strapi caddy || true
  restore
  exit 1
fi
remember "$tag"

if [ "$current" != "$tag" ]; then
  [ -n "$current" ] && echo "$current" > .previous-tag
  [ -f .deployed-compose.yml ] && mv .deployed-compose.yml .previous-compose.yml
  echo "$tag" > .deployed-tag
fi
cp docker-compose.yml .deployed-compose.yml
docker image prune -f >/dev/null
echo "✓ Version $tag en ligne"
