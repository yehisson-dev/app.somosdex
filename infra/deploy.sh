#!/bin/bash
# ─── deploy.sh ──────────────────────────────────────────────────────────────
# Actualizar la app en el servidor (cuando haya cambios)
# bash /opt/cowork/infra/deploy.sh
set -e

APP_DIR="/opt/cowork"
cd "$APP_DIR"

echo "▶ Reconstruyendo y reiniciando la app..."
docker compose down app
docker compose up -d --build app
echo "✓ App actualizada en https://app.somosdex.com"
