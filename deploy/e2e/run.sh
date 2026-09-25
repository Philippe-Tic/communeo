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

step "Fichier dans la médiathèque de la commune"
printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' | base64 --decode > /tmp/communeo-e2e.png
file_url=$(curl -sS -X POST "$base/api/media-items/upload" -H "Authorization: Bearer $token" -H "X-Site-Document-Id: $site" \
  -F 'files=@/tmp/communeo-e2e.png;type=image/png;filename=salle.png' -F 'alt_text=Salle des fêtes' | jq -r .data.file.url)
[ -n "$file_url" ] && [ "$file_url" != null ] || fail "fichier non envoyé"
curl -fsS -o /dev/null "$base$file_url" || fail "fichier non servi"
echo "  $file_url"

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

step "Sauvegarde (copie S3 chiffrée)"
compose exec -T backup backup.sh
compose exec -T backup sh -c '
  set -e
  . /usr/local/bin/remote.sh
  # Rien de lisible dans le stockage objet : noms et contenus chiffrés
  ! rclone lsf -R "remote:$BACKUP_S3_BUCKET" | grep -q -e "db-" -e "salle"
  rclone lsf -R "${target}" | grep -q "^db/db-.*\.dump$"
  rclone lsf -R "${target}uploads" | grep -q "salle"
' || fail "copie S3 absente, lisible ou incomplète"
echo "  copie S3 chiffrée (noms et contenus)"

step "Serveur perdu : suppression, sauvegardes locales effacées, restauration depuis S3"
api DELETE "/api/site-management/$site" '' -o /dev/null
[ "$(api GET "/api/site-management/$site" '' -o /dev/null -w '%{http_code}')" = 404 ] || fail "commune non supprimée"
[ "$(curl -sS -o /dev/null -w '%{http_code}' "$base$file_url")" = 404 ] || fail "fichier non supprimé avec la commune"
compose stop strapi worker
compose exec -T backup sh -c 'rm -rf /backups/*'
compose run --rm -T backup restore.sh --from-s3 latest
compose up -d strapi worker
wait_healthy "strapi" 300
token=$(curl -sS -X POST "$base/api/auth/local" -H 'Content-Type: application/json' \
  --data "{\"identifier\":\"equipe@communeo.test\",\"password\":\"$E2E_SUPER_PASSWORD\"}" | jq -r .jwt)
[ "$(api GET "/api/site-management/$site" '' | jq -r .data.name)" = "Commune E2E" ] || fail "commune absente après restauration"
curl -fsS -o /dev/null "$base$file_url" || fail "fichier absent après restauration"
echo "  commune et fichier restaurés depuis S3"

printf '\n✓ Stack de production : démarrage, admin, commune, fichier, mise en ligne, preview, sauvegarde S3 chiffrée, restauration après perte du serveur\n'
