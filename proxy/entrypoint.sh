#!/bin/sh
set -e

DOMAIN="money-tracker.iartetadev.es"
LIVE_DIR="/etc/letsencrypt/live/${DOMAIN}"
CERT="${LIVE_DIR}/fullchain.pem"
KEY="${LIVE_DIR}/privkey.pem"

# Si no existen certificados (aún no se ha ejecutado certbot), crear autofirmado para que nginx arranque
if [ ! -f "$CERT" ] || [ ! -f "$KEY" ]; then
  echo "No hay certificados SSL. Creando certificado autofirmado temporal..."
  mkdir -p "$LIVE_DIR"
  openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
    -keyout "$KEY" -out "$CERT" \
    -subj "/CN=${DOMAIN}"
  echo "Certificado autofirmado creado. Ejecuta certbot para obtener el certificado real."
fi

exec nginx -g "daemon off;"
