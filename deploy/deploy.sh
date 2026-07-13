#!/usr/bin/env bash
# ============================================================
# Деплой лендинга на сервер по SSH (rsync статики из dist/).
# Использование:
#   DEPLOY_HOST=user@1.2.3.4 [DEPLOY_PATH=/var/www/doloy-unynie] bash deploy/deploy.sh
# ============================================================
set -euo pipefail

HOST="${DEPLOY_HOST:?Укажи DEPLOY_HOST=user@host}"
DEST="${DEPLOY_PATH:-/var/www/doloy-unynie}"

echo "[deploy] build…"
npm run build

echo "[deploy] rsync dist/ → ${HOST}:${DEST}"
ssh "$HOST" "mkdir -p '$DEST'"
rsync -az --delete dist/ "$HOST:$DEST/"

echo "[deploy] готово: содержимое dist/ на ${HOST}:${DEST}"
echo "[deploy] проверь: curl -I http://<домен>.duckdns.org"
