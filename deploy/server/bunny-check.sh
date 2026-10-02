#!/usr/bin/env bash
# Sur le serveur, dans le dossier du .env (voir DEPLOYMENT.md) : vérifie ce dont Bunny CDN a besoin (#382)
# avant de passer SITES_PUBLISHER=bunny (#383), sans rien modifier :
#   ./bunny-check.sh            clé d'API, limites du compte, zone Bunny DNS, origine des sites
#   ./bunny-check.sh <slug>     et en plus : le site de cette commune servi par l'origine (avec le secret)
# N'affiche aucun secret : la clé et le secret passent à curl par un fichier temporaire (jamais dans la ligne
# de commande, visible par `ps`), jamais sur la sortie.
set -euo pipefail
cd "$(dirname "$0")"

slug=${1:-}
failures=0
ok() { printf '  ✓ %s\n' "$*"; }
ko() { printf '  ✗ %s\n' "$*"; failures=$((failures + 1)); }
step() { printf '\n▸ %s\n' "$*"; }

# Valeur d'une variable du .env (dernière occurrence, guillemets retirés), sans exécuter le fichier
env_value() {
  [ -f .env ] || return 0
  sed -n "s/^$1=//p" .env | tail -1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"
}

api_key=$(env_value BUNNY_API_KEY)
dns_zone=$(env_value BUNNY_DNS_ZONE_ID)
secret=$(env_value SITES_ORIGIN_SECRET)
origin=$(env_value ORIGIN_DOMAIN)
origin=${origin:-origine.communeo.fr}
sites_domain=$(env_value SITES_DOMAIN)
domain=$(env_value DOMAIN)
publisher=$(env_value SITES_PUBLISHER)

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
chmod 700 "$work"
# En-têtes secrets dans des fichiers lisibles par nous seuls (curl -H @fichier)
printf 'AccessKey: %s\n' "$api_key" > "$work/cle"
printf 'X-Communeo-Origine: %s\n' "$secret" > "$work/secret"

bunny() { # bunny CHEMIN → corps dans $work/reponse, code HTTP sur la sortie
  curl -sS --max-time 30 -o "$work/reponse" -w '%{http_code}' -H @"$work/cle" -H 'Accept: application/json' "https://api.bunny.net$1" || true
}
json() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=JSON.parse(s);console.log(eval(process.argv[1])??"")})' "$1" < "$work/reponse" 2>/dev/null \
  || python3 -c 'import json,sys; v=json.load(open(sys.argv[2])); r=eval(sys.argv[1]); print("" if r is None else r)' "$2" "$work/reponse" 2>/dev/null || true; }

step "Variables du .env"
[ "$publisher" = bunny ] && ok "SITES_PUBLISHER=bunny : les sites sont publiés chez Bunny" || ok "SITES_PUBLISHER=${publisher:-(vide)} : Bunny pas encore utilisé (Netlify ou volume seul)"
[ -n "$api_key" ] && ok "BUNNY_API_KEY définie" || ko "BUNNY_API_KEY absente"
[ -n "$dns_zone" ] && ok "BUNNY_DNS_ZONE_ID = $dns_zone" || ko "BUNNY_DNS_ZONE_ID absent (aucune adresse <commune>.${sites_domain:-communeo.fr} ne sera créée)"
[ -n "$secret" ] && ok "SITES_ORIGIN_SECRET défini (${#secret} caractères)" || ko "SITES_ORIGIN_SECRET absent : l'origine refuse tout"
[ -n "$sites_domain" ] && ok "SITES_DOMAIN = $sites_domain" || ko "SITES_DOMAIN absent (sites seulement sur *.b-cdn.net)"
ok "ORIGIN_DOMAIN = $origin"

if [ -n "$api_key" ]; then
  step "Clé d'API Bunny et limites du compte"
  status=$(bunny '/pullzone?page=1&perPage=1000')
  case "$status" in
    200)
      total=$(json 'Array.isArray(v) ? v.length : v.TotalItems' 'len(v) if isinstance(v, list) else v["TotalItems"]')
      ok "clé acceptée ; Pull Zones sur le compte : ${total:-?} (limite par défaut : 500, relevée sur demande au support)"
      communeo=$(json '(Array.isArray(v) ? v : v.Items).filter(z => /^(dev-)?communeo-/.test(z.Name)).length' 'len([z for z in (v if isinstance(v, list) else v["Items"]) if z["Name"].startswith(("communeo-", "dev-communeo-"))])')
      ok "dont Pull Zones de communes (communeo-*) : ${communeo:-?}"
      ;;
    401) ko "clé refusée (401) : BUNNY_API_KEY = clé du compte (Account settings → API key), pas une clé de Storage Zone" ;;
    000) ko "api.bunny.net injoignable depuis le serveur" ;;
    *) ko "réponse inattendue de l'API ($status)" ;;
  esac

  if [ -n "$dns_zone" ]; then
    step "Zone Bunny DNS"
    status=$(bunny "/dnszone/$dns_zone")
    if [ "$status" = 200 ]; then
      zone_domain=$(json 'v.Domain' 'v["Domain"]')
      records=$(json '(v.Records || []).length' 'len(v.get("Records") or [])')
      ok "zone $zone_domain, $records enregistrement(s) (limite : 5 000)"
      if [ -n "$sites_domain" ] && [ "$zone_domain" != "$sites_domain" ]; then ko "la zone ($zone_domain) n'est pas SITES_DOMAIN ($sites_domain)"; fi
      # Délégation réelle, lue dans le DNS public (NameserversDetected de l'API Bunny peut être vrai avant le changement)
      ns=$(curl -sS --max-time 15 -H 'Accept: application/dns-json' "https://cloudflare-dns.com/dns-query?name=$zone_domain&type=NS" 2>/dev/null \
        | grep -o '"data":"[^"]*"' | cut -d'"' -f4 | sed 's/\.$//' | sort | tr '\n' ' ' || true)
      case "$ns" in
        "") ok "serveurs de noms de $zone_domain illisibles depuis le serveur (DNS public)" ;;
        *bunny.net*) ok "serveurs de noms : $ns→ la zone Bunny est en service" ;;
        *) ok "serveurs de noms : $ns→ pas encore Bunny : les adresses des communes existent mais ne servent pas encore (bascule #383)" ;;
      esac
    else
      ko "zone DNS $dns_zone illisible ($status)"
    fi
  fi
fi

step "Origine des sites ($origin)"
status=$(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' "https://$origin/sites/x/" || true)
[ "$status" = 403 ] && ok "fermée sans l'en-tête secret (403)" || ko "sans l'en-tête secret : $status au lieu de 403"
if [ -n "$secret" ]; then
  status=$(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' -H @"$work/secret" "https://$origin/sites/commune-inexistante-bunny-check/" || true)
  [ "$status" = 404 ] && ok "ouverte avec l'en-tête secret (404 pour un site inconnu)" || ko "avec l'en-tête secret : $status au lieu de 404 (secret différent de celui de Caddy ?)"
  if [ -n "$slug" ]; then
    status=$(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' -H @"$work/secret" "https://$origin/sites/$slug/" || true)
    [ "$status" = 200 ] && ok "site $slug servi (200)" || ko "site $slug : $status au lieu de 200 (publié dans le volume ?)"
  fi
fi

if [ -n "$domain" ]; then
  step "Autorisation des certificats des domaines nus"
  status=$(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' "https://$domain/api/domain/certificate-check?domain=exemple.fr" || true)
  [ "$status" = 404 ] && ok "fermée au public (404)" || ko "https://$domain/api/domain/certificate-check répond $status au lieu de 404"
  if docker compose ps -q caddy >/dev/null 2>&1 && [ -n "$(docker compose ps -q caddy 2>/dev/null)" ]; then
    status=$(docker compose exec -T caddy wget -S -q -O /dev/null "http://strapi:1337/api/domain/certificate-check?domain=exemple-bunny-check.fr" 2>&1 | grep -o 'HTTP/[0-9.]* [0-9]*' | tail -1 | cut -d' ' -f2 || true)
    [ "$status" = 404 ] && ok "joignable par Caddy sur le réseau interne (404 pour un domaine inconnu)" || ko "Caddy → Strapi : ${status:-pas de réponse} au lieu de 404"
  fi
fi

echo
if [ "$failures" -gt 0 ]; then
  echo "✗ $failures point(s) à corriger"
  exit 1
fi
echo "✓ Bunny prêt"
