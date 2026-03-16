#!/bin/sh
set -e

DOMAIN="money-tracker.iartetadev.es"
LIVE_DIR="/etc/letsencrypt/live/${DOMAIN}"
LIVE_DIR_0001="/etc/letsencrypt/live/${DOMAIN}-0001"
CERT="${LIVE_DIR}/fullchain.pem"
KEY="${LIVE_DIR}/privkey.pem"
SELFSIGNED_DIR="/etc/nginx/ssl"
CONF="/etc/nginx/conf.d/default.conf"
TEMPLATE="/etc/nginx/conf.d/default.conf.template"

# Si certbot guardó el cert en -0001 (p. ej. tras borrar el anterior), enlazar para que nginx lo encuentre
if [ ! -f "$CERT" ] && [ -f "${LIVE_DIR_0001}/fullchain.pem" ] && [ -f "${LIVE_DIR_0001}/privkey.pem" ]; then
  echo "Certificado encontrado en ${DOMAIN}-0001, creando enlace para nginx..."
  ln -sf "${DOMAIN}-0001" "/etc/letsencrypt/live/${DOMAIN}"
fi

# Siempre partir del template para no pisar la config cuando certbot ya haya creado certificados
cp "$TEMPLATE" "$CONF"

# Si no existen certificados de Let's Encrypt, usar autofirmado en ruta distinta (no tocar live/)
if [ ! -f "$CERT" ] || [ ! -f "$KEY" ]; then
  echo "No hay certificados SSL de Let's Encrypt. Usando certificado autofirmado temporal..."
  mkdir -p "$SELFSIGNED_DIR"
  openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
    -keyout "${SELFSIGNED_DIR}/privkey.pem" -out "${SELFSIGNED_DIR}/fullchain.pem" \
    -subj "/CN=${DOMAIN}"
  # Apuntar nginx al autofirmado
  sed -i "s|/etc/letsencrypt/live/${DOMAIN}/fullchain.pem|${SELFSIGNED_DIR}/fullchain.pem|g" "$CONF"
  sed -i "s|/etc/letsencrypt/live/${DOMAIN}/privkey.pem|${SELFSIGNED_DIR}/privkey.pem|g" "$CONF"
  echo "Certificado autofirmado activo. Ejecuta certbot y reinicia el proxy para usar Let's Encrypt."
fi

exec nginx -g "daemon off;"
