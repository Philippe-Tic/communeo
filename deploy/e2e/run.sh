#!/usr/bin/env bash
# Test de bout en bout de la stack de production (#179), en local ou en CI :
# démarrage (images de production, contrôles de santé), admin, connexion, création d'une commune,
# mise en ligne réelle par le worker, preview fermée sans jeton, sauvegarde puis restauration.
#   deploy/e2e/run.sh                 construit les images puis teste
#   E2E_BUILD=0 IMAGE_REGISTRY=ghcr.io/philippe-tic IMAGE_TAG=<sha> deploy/e2e/run.sh   images publiées
#   E2E_KEEP=1 deploy/e2e/run.sh      garde la stack après le test (http://localhost:8088)
set -euo pipefail
cd "$(dirname "$0")/../.."

set -a
# shellcheck disable=SC1091
source deploy/e2e/e2e.env
set +a
export IMAGE_REGISTRY="${E2E_REGISTRY:-$IMAGE_REGISTRY}" IMAGE_TAG="${E2E_TAG:-$IMAGE_TAG}"
compose() { docker compose --env-file deploy/e2e/e2e.env -f docker-compose.yml -f deploy/e2e/compose.e2e.yml "$@"; }
base="http://localhost:${E2E_PORT:-8088}"
step() { printf '\n▸ %s\n' "$*"; }
fail() { printf '✗ %s\n' "$*" >&2; compose ps >&2 || true; compose logs --tail 80 strapi worker >&2 || true; exit 1; }

cleanup() { [ "${E2E_KEEP:-0}" = 1 ] || compose down -v --remove-orphans >/dev/null 2>&1 || true; }
trap cleanup EXIT

wait_healthy() {
  local deadline=$((SECONDS + ${2:-300}))
  for service in $1; do
    until [ "$(docker inspect -f '{{.State.Health.Status}}' "$(compose ps -q "$service")" 2>/dev/null)" = healthy ]; do
      [ $SECONDS -lt $deadline ] || fail "$service n'est pas sain"
      sleep 3
    done
    echo "  $service : sain"
  done
}

api() { # api METHODE CHEMIN [JSON] [en-têtes supplémentaires…]
  local method=$1 path=$2 body=${3:-}
  shift 3 || shift $#
  curl -sS -X "$method" "$base$path" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' "$@" ${body:+--data "$body"}
}

if [ "${E2E_BUILD:-1}" = 1 ]; then
  step "Construction des images"
  compose build
fi

step "Démarrage"
compose down -v --remove-orphans >/dev/null 2>&1 || true
compose up -d
wait_healthy "postgres strapi preview nginx backup" 420

step "Admin et API derrière nginx"
curl -fsS "$base/healthz" | grep -q ok || fail "healthz"
curl -fsS "$base/api/health" | jq -e '.status == "ok"' >/dev/null || fail "/api/health"
curl -fsS "$base/" | grep -q 'id="root"' || fail "l'admin n'est pas servie"
curl -fsS "$base/connexion" | grep -q 'id="root"' || fail "routes de l'admin (SPA) non servies"

step "Connexion du super admin"
token=$(curl -sS -X POST "$base/api/auth/local" -H 'Content-Type: application/json' \
  --data "{\"identifier\":\"equipe@communeo.test\",\"password\":\"$E2E_SUPER_PASSWORD\"}" | jq -r .jwt)
[ -n "$token" ] && [ "$token" != null ] || fail "connexion impossible"

step "Création d'une commune"
site=$(api POST /api/site-management '{"data":{"name":"Commune E2E","slug":"commune-e2e","admin_email":"maire@commune-e2e.test","admin_first_name":"Anne","admin_last_name":"Maire"}}' | jq -r .data.documentId)
[ -n "$site" ] && [ "$site" != null ] || fail "commune non créée"
echo "  $site"

step "Mise en ligne par le worker"
status=$(api POST /api/deployment/trigger '' -H "X-Site-Document-Id: $site" -o /dev/null -w '%{http_code}')
[ "$status" = 202 ] || fail "mise en ligne refusée ($status)"
deadline=$((SECONDS + 300))
while :; do
  state=$(api GET /api/deployment/state '' -H "X-Site-Document-Id: $site" | jq -r .state)
  [ "$state" = ok ] && break
  [ "$state" = failed ] && fail "la mise en ligne a échoué"
  [ $SECONDS -lt $deadline ] || fail "mise en ligne trop longue (état : $state)"
  sleep 5
done
compose exec -T worker sh -c 'grep -q "Commune E2E" /app/published/commune-e2e/index.html' || fail "site publié introuvable"
echo "  site publié : commune-e2e/index.html"

step "Preview fermée sans jeton"
compose exec -T preview sh -c "wget -S --spider http://127.0.0.1:4321/ 2>&1 | grep -q ' 401 '" || fail "la preview répond sans jeton"

step "Sauvegarde, suppression, restauration"
compose exec -T backup backup.sh
# Copie hors du serveur : chiffrée, et relisible avec la phrase de passe (PRODUCTION.md, serveur perdu)
compose exec -T backup sh -c '
  set -e
  stamp=$(ls /backups | sed -n "s/^db-\(.*\)\.dump$/\1/p" | sort | tail -n 1)
  rclone lsf "remote:$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX" | grep -q "db-$stamp.dump.enc"
  ! rclone lsf "remote:$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX" | grep -q "db-$stamp.dump$"
  rm -rf /tmp/s3 && rclone copy "remote:$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX" /tmp/s3 --include "*$stamp*"
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE -in "/tmp/s3/db-$stamp.dump.enc" -out /tmp/s3/db.dump
  cmp /tmp/s3/db.dump "/backups/db-$stamp.dump"
' || fail "copie S3 chiffrée absente ou illisible"
echo "  copie S3 chiffrée, relue et déchiffrée"
api DELETE "/api/site-management/$site" '' -o /dev/null
[ "$(api GET "/api/site-management/$site" '' -o /dev/null -w '%{http_code}')" = 404 ] || fail "commune non supprimée"
compose stop strapi worker
compose run --rm -T backup restore.sh latest
compose up -d strapi worker
wait_healthy "strapi" 300
token=$(curl -sS -X POST "$base/api/auth/local" -H 'Content-Type: application/json' \
  --data "{\"identifier\":\"equipe@communeo.test\",\"password\":\"$E2E_SUPER_PASSWORD\"}" | jq -r .jwt)
[ "$(api GET "/api/site-management/$site" '' | jq -r .data.name)" = "Commune E2E" ] || fail "commune absente après restauration"
echo "  commune restaurée"

printf '\n✓ Stack de production : démarrage, admin, commune, mise en ligne, preview, sauvegarde et restauration\n'
