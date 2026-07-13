#!/usr/bin/env bash
# ============================================================
# Обновление IP в DuckDNS (нужно, если у сервера динамический IP;
# для VPS со статическим IP достаточно запустить один раз).
# На сервере:
#   DUCKDNS_DOMAIN=поддомен DUCKDNS_TOKEN=xxxx bash duckdns-update.sh
# Автообновление (динамический IP) — в crontab сервера:
#   */5 * * * * DUCKDNS_DOMAIN=поддомен DUCKDNS_TOKEN=xxxx /path/duckdns-update.sh >/tmp/duckdns.log 2>&1
# ============================================================
set -euo pipefail

DOMAIN="${DUCKDNS_DOMAIN:?Укажи DUCKDNS_DOMAIN=поддомен (без .duckdns.org)}"
TOKEN="${DUCKDNS_TOKEN:?Укажи DUCKDNS_TOKEN (из личного кабинета duckdns.org)}"

RESP=$(curl -fsS "https://www.duckdns.org/update?domains=${DOMAIN}&token=${TOKEN}&ip=")
echo "[duckdns] ${DOMAIN}.duckdns.org → ${RESP}"
[ "$RESP" = "OK" ] || { echo "[duckdns] ОШИБКА: проверь домен/токен"; exit 1; }
