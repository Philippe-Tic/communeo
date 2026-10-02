#!/usr/bin/env bash
# Test de bout en bout de la stack de production (#179, #381), en local ou en CI :
# démarrage (images de production, contrôles de santé), Caddy (https avec son autorité interne, http → https,
# en-têtes), admin, connexion, création d'une commune, mise en ligne réelle par le worker dans le volume des
# sites, site servi par l'origine (en-tête secret, redirection de l'ancien site, noindex d'un site en essai,
# /x → x.html, page 404), domaine nu d'une commune (certificat à la demande autorisé par Strapi, redirection
# vers www), preview fermée sans jeton, alerte disque, sauvegarde puis restauration.
#   deploy/e2e/run.sh                 construit les images puis teste
#   E2E_BUILD=0 IMAGE_REGISTRY=ghcr.io/philippe-tic IMAGE_TAG=<sha> deploy/e2e/run.sh   images publiées
#   E2E_KEEP=1 deploy/e2e/run.sh      garde la stack après le test (https://localhost:8443, certificat de
#                                     l'autorité interne de Caddy : $TMPDIR/communeo-e2e-caddy-root.crt)
set -euo pipefail
cd "$(dirname "$0")/../.."

set -a
# shellcheck disable=SC1091
source deploy/e2e/e2e.env
set +a
export IMAGE_REGISTRY="${E2E_REGISTRY:-$IMAGE_REGISTRY}" IMAGE_TAG="${E2E_TAG:-$IMAGE_TAG}"
compose() { docker compose --env-file deploy/e2e/e2e.env -f docker-compose.yml -f deploy/e2e/compose.e2e.yml "$@"; }
port=${E2E_PORT:-8443}
base="https://localhost:$port"
http_base="http://localhost:${E2E_HTTP_PORT:-8088}"
step() { printf '\n▸ %s\n' "$*"; }
fail() { printf '✗ %s\n' "$*" >&2; compose ps >&2 || true; compose logs --tail 80 strapi worker caddy >&2 || true; exit 1; }

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

# Requête https vers un autre domaine servi par Caddy (preview.localhost, origine.localhost)
on() { # on DOMAINE CHEMIN [options curl…]
  local host=$1 path=$2
  shift 2
  curl -sS --resolve "$host:$port:127.0.0.1" "https://$host:$port$path" "$@"
}
origin_secret=(-H "X-Communeo-Origine: $SITES_ORIGIN_SECRET")
header() { grep -i "^$1:" | head -1 | cut -d: -f2- | tr -d '\r' | sed 's/^ *//'; }

if [ "${E2E_BUILD:-1}" = 1 ]; then
  step "Construction des images"
  compose build
fi

step "Démarrage"
compose down -v --remove-orphans >/dev/null 2>&1 || true
compose up -d
wait_healthy "postgres strapi preview caddy backup" 420

step "Caddy : https (autorité interne), http → https, en-têtes"
# Certificats de l'autorité interne de Caddy : vérifiés par curl, comme le ferait un navigateur
ca="${TMPDIR:-/tmp}/communeo-e2e-caddy-root.crt"
compose exec -T caddy cat /data/caddy/pki/authorities/local/root.crt > "$ca"
export CURL_CA_BUNDLE="$ca"
deadline=$((SECONDS + 60))
until curl -fsS -o /dev/null "$base/healthz"; do
  [ $SECONDS -lt $deadline ] || fail "https : certificat absent ou invalide"
  sleep 2
done
curl -fsS "$http_base/healthz" | grep -q ok || fail "healthz en http (contrôle de santé)"
redirect=$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' "$http_base/connexion?a=1")
[ "$redirect" = "301 https://localhost/connexion?a=1" ] || fail "http → https : $redirect"
headers=$(curl -fsS -D - -o /dev/null "$base/")
for expected in 'X-Frame-Options: SAMEORIGIN' 'X-Content-Type-Options: nosniff' 'Referrer-Policy: strict-origin-when-cross-origin' \
  'Strict-Transport-Security: max-age=63072000; includeSubDomains' 'Cache-Control: no-cache, no-store, must-revalidate'; do
  grep -qi "^$expected" <<<"$headers" || fail "en-tête absent de l'admin : $expected"
done
asset=$(curl -fsS "$base/" | grep -o '/assets/[^"]*\.js' | head -1)
[ "$(curl -fsS -D - -o /dev/null "$base$asset" | header Cache-Control)" = "public, max-age=31536000, immutable" ] || fail "cache des assets de l'admin"
echo "  https vérifié, $http_base → $base, en-têtes de sécurité et de cache"

step "Admin et API derrière Caddy"
curl -fsS "$base/healthz" | grep -q ok || fail "healthz"
curl -fsS "$base/api/health" | jq -e '.status == "ok"' >/dev/null || fail "/api/health"
[ "$(curl -fsS -D - -o /dev/null "$base/api/health" | header Cache-Control)" = "no-store, no-cache, must-revalidate" ] || fail "/api en cache"
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
# Envoi au-delà de la limite de Caddy (50 Mo, comme nginx) : refusé avant Strapi
head -c $((51 * 1024 * 1024)) /dev/zero > /tmp/communeo-e2e-gros.bin
status=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$base/api/media-items/upload" -H "Authorization: Bearer $token" \
  -H "X-Site-Document-Id: $site" -F 'files=@/tmp/communeo-e2e-gros.bin;type=application/pdf;filename=gros.pdf' || true)
rm -f /tmp/communeo-e2e-gros.bin
[ "$status" = 413 ] || fail "envoi de 51 Mo : $status au lieu de 413"
echo "  envoi de 51 Mo refusé (413)"

step "Redirection de l'ancien site et commune en essai"
api PUT /api/redirects '{"redirects":[{"from":"/horaires.html","to":"/contact"}]}' -H "X-Site-Document-Id: $site" | jq -e '.data.redirects | length == 1' >/dev/null \
  || fail "redirection non enregistrée"
# Pas d'inscription en libre-service ici (e-mails) : la commune passe en essai directement dans la base
compose exec -T postgres psql -qtA -U strapi strapi \
  -c "UPDATE sites SET plan = 'trial', trial_ends_at = now() + interval '30 days' WHERE document_id = '$site'" >/dev/null
echo "  /horaires.html → /contact, commune en essai"

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
compose exec -T worker sh -c 'grep -q "Commune E2E" /srv/sites/commune-e2e/index.html' || fail "site publié introuvable"
echo "  site publié : /srv/sites/commune-e2e/index.html"

step "Origine des sites (Caddy)"
status=$(on origine.localhost /sites/commune-e2e/ -o /dev/null -w '%{http_code}')
[ "$status" = 403 ] || fail "origine servie sans l'en-tête secret ($status)"
status=$(on origine.localhost /sites/commune-e2e/ -o /dev/null -w '%{http_code}' -H 'X-Communeo-Origine: mauvais')
[ "$status" = 403 ] || fail "origine servie avec un mauvais secret ($status)"
on origine.localhost /sites/commune-e2e/ -f "${origin_secret[@]}" | grep -q "Commune E2E" || fail "accueil du site non servi"
page=$(on origine.localhost /sites/commune-e2e/contact -f -D /tmp/communeo-e2e-headers "${origin_secret[@]}")
[ "$page" = "$(compose exec -T worker cat /srv/sites/commune-e2e/contact.html)" ] || fail "/contact ne sert pas contact.html"
[ "$(header X-Robots-Tag </tmp/communeo-e2e-headers)" = "noindex, nofollow" ] || fail "X-Robots-Tag absent d'un site en essai"
[ "$(header Cache-Control </tmp/communeo-e2e-headers)" = "public, max-age=0, must-revalidate" ] || fail "cache des pages"
astro=$(compose exec -T worker sh -c 'cd /srv/sites/commune-e2e && ls _astro | head -1')
[ "$(on origine.localhost "/sites/commune-e2e/_astro/$astro" -f -D - -o /dev/null "${origin_secret[@]}" | header Cache-Control)" = "public, max-age=31536000, immutable" ] \
  || fail "cache des fichiers d'Astro"
redirect=$(on origine.localhost '/sites/commune-e2e/horaires.html' -o /dev/null -w '%{http_code} %header{location}' "${origin_secret[@]}")
[ "$redirect" = "301 /contact" ] || fail "redirection de l'ancien site : $redirect"
status=$(on origine.localhost /sites/commune-e2e/page-inconnue -o /tmp/communeo-e2e-404 -w '%{http_code}' "${origin_secret[@]}")
[ "$status" = 404 ] && cmp -s /tmp/communeo-e2e-404 <(compose exec -T worker cat /srv/sites/commune-e2e/404.html) || fail "page 404 du site ($status)"
status=$(on origine.localhost /sites/commune-e2e/.regles/site.caddy -o /dev/null -w '%{http_code}' "${origin_secret[@]}")
[ "$status" = 404 ] || fail "règles du site servies ($status)"
echo "  403 sans secret ; accueil, /contact → contact.html, 301 de l'ancien site, noindex, cache, 404 du site"

step "Domaine nu d'une commune : certificat à la demande (autorisé par Strapi), redirection vers www (#382)"
ask() { compose exec -T caddy wget -S -q -O /dev/null "http://strapi:1337/api/domain/certificate-check?domain=$1" 2>&1 | grep -o 'HTTP/[0-9.]* [0-9]*' | tail -1 | cut -d' ' -f2 || true; }
[ "$(ask mairie-e2e.test)" = 404 ] || fail "certificat autorisé pour un domaine qu'aucune commune n'a vérifié"
compose exec -T postgres psql -qtA -U strapi strapi \
  -c "UPDATE sites SET custom_domain = 'mairie-e2e.test', domain_type = 'apex', domain_status = 'verified' WHERE document_id = '$site'" >/dev/null
[ "$(ask mairie-e2e.test)" = 200 ] || fail "certificat refusé pour le domaine vérifié de la commune"
[ "$(ask www.mairie-e2e.test)" = 404 ] || fail "certificat autorisé pour www (servi par le CDN, jamais par le serveur)"
status=$(curl -sS -o /dev/null -w '%{http_code}' "$base/api/domain/certificate-check?domain=mairie-e2e.test")
[ "$status" = 404 ] || fail "autorisation des certificats ouverte au public ($status)"
redirect=$(on mairie-e2e.test '/actualites?page=2' -o /dev/null -w '%{http_code} %{redirect_url}')
[ "$redirect" = "301 https://www.mairie-e2e.test/actualites?page=2" ] || fail "domaine nu → www : $redirect"
on inconnu-e2e.test / -o /dev/null 2>/dev/null && fail "certificat délivré pour un domaine inconnu"
echo "  certificat pour le domaine vérifié seulement, mairie-e2e.test → www.mairie-e2e.test (301), point d'autorisation fermé au public"

step "Preview fermée sans jeton"
status=$(on preview.localhost / -o /dev/null -D /tmp/communeo-e2e-headers -w '%{http_code}')
[ "$status" = 401 ] || fail "la preview répond sans jeton ($status)"
[ "$(header X-Robots-Tag </tmp/communeo-e2e-headers)" = "noindex, nofollow, noarchive" ] || fail "X-Robots-Tag absent de la preview"

step "Alerte disque (e-mail à l'équipe)"
# Faux service d'envoi d'e-mails dans le conteneur du worker (Node) : il garde la requête reçue
compose exec -d worker node -e "require('http').createServer((req, res) => { let body = ''; req.on('data', (d) => (body += d)); req.on('end', () => { require('fs').writeFileSync('/tmp/e-mail.json', JSON.stringify({ auth: req.headers.authorization, body: JSON.parse(body) })); res.end('{}'); }); }).listen(8025)"
sleep 2
alert() { compose exec -T -e DISK_ALERT_THRESHOLD=1 -e RESEND_API_KEY=e2e-resend -e DISK_ALERT_TO=equipe@communeo.test -e RESEND_API_URL=http://worker:8025 backup disk-alert.sh; }
alert | grep -q "e-mail envoyé à equipe@communeo.test" || fail "alerte disque non envoyée"
compose exec -T worker cat /tmp/e-mail.json | jq -e '.auth == "Bearer e2e-resend" and .body.to == ["equipe@communeo.test"] and (.body.subject | test("disque rempli"))' >/dev/null \
  || fail "e-mail d'alerte incorrect"
alert | grep -q "e-mail envoyé" && fail "alerte renvoyée dans la journée"
echo "  e-mail envoyé une fois au-delà du seuil"

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

printf '\n✓ Stack de production : démarrage, Caddy (https, en-têtes), admin, commune, fichier, mise en ligne, origine des sites, domaine nu → www, preview, alerte disque, sauvegarde S3 chiffrée, restauration après perte du serveur\n'
