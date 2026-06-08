#!/bin/bash
# ─── setup-server.sh ────────────────────────────────────────────────────────
# Ejecutar UNA SOLA VEZ en el servidor Hetzner (como root)
# bash /opt/cowork/infra/setup-server.sh
set -e

APP_DIR="/opt/cowork"
DOMAIN="app.somosdex.com"
EMAIL="yehisson@somosdex.com"

echo "══════════════════════════════════════════"
echo "  Configurando servidor Cowork Agency"
echo "  Dominio: $DOMAIN"
echo "══════════════════════════════════════════"

# 1. Actualizar sistema
apt-get update -y && apt-get upgrade -y

# 2. Instalar Docker
if ! command -v docker &>/dev/null; then
  echo "▶ Instalando Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "✓ Docker instalado"
else
  echo "✓ Docker ya instalado"
fi

# 3. Instalar Docker Compose plugin
if ! docker compose version &>/dev/null; then
  echo "▶ Instalando Docker Compose..."
  apt-get install -y docker-compose-plugin
  echo "✓ Docker Compose instalado"
else
  echo "✓ Docker Compose ya instalado"
fi

cd "$APP_DIR"

# 4. Crear carpetas para certbot
mkdir -p infra/certbot/conf infra/certbot/www

# 5. Arrancar nginx temporal para obtener certificado SSL
echo "▶ Obteniendo certificado SSL..."
cp infra/nginx.conf infra/nginx.conf.bak   # guardar el definitivo
cp infra/nginx-init.conf infra/nginx.conf  # usar el temporal

docker compose up -d nginx
sleep 3

# 6. Obtener certificado con Let's Encrypt
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

echo "✓ Certificado SSL obtenido"

# 7. Restaurar nginx.conf definitivo (con HTTPS)
cp infra/nginx.conf.bak infra/nginx.conf

# 8. Construir y arrancar la app
echo "▶ Construyendo la aplicación (puede tardar 3-5 minutos)..."
docker compose down
docker compose up -d --build

echo ""
echo "══════════════════════════════════════════"
echo "  ✅ Despliegue completado"
echo "  🌐 https://$DOMAIN"
echo "══════════════════════════════════════════"
