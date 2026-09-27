#!/bin/sh
# Lancé par l'entrypoint de l'image nginx (/docker-entrypoint.d) : recharge nginx toutes les 12 heures
# pour qu'il prenne les certificats renouvelés par le service certbot.
( while sleep 12h; do nginx -s reload; done ) &
