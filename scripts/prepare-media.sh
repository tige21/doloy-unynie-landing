#!/usr/bin/env bash
# ============================================================
# Подготовка медиа-ассетов лендинга «Долой уныние».
# Источники: assets/ → результат: public/media/
# Законы: DL Приложение Ж (паспорта ассетов), DL 7 (фото), DL 8 (видео).
#   - видео-3 обрезается до 3.4с (чёрный хвост запрещён — Ж13)
#   - постер кульминации: ~2.9с, руки ещё не вверху (Ж11)
#   - у эха и поп-коллажа аудиодорожка удаляется (беззвучные циклы)
# ============================================================
set -euo pipefail

SRC_V="assets/videos"
SRC_P="assets/photos"
OUT="public/media"
mkdir -p "$OUT"

V1="$SRC_V/2026-07-13 05.08.24.mp4" # крик в зале, 2.3с → echo
V2="$SRC_V/2026-07-13 05.08.56.mp4" # крик в парке, 6.0с → climax
V3="$SRC_V/2026-07-13 05.09.04.mp4" # поп-коллаж, 5.0с → pop (trim 3.4)

log() { echo "[media] $*"; }

size_of() { du -h "$1" | cut -f1; }

HAS_VP9=0
if ffmpeg -hide_banner -encoders 2>/dev/null | grep -q libvpx-vp9; then
  HAS_VP9=1
else
  log "WARN: libvpx-vp9 недоступен — webm пропускается, только mp4"
fi

encode_mp4() { # in, out, audio(yes|no), trim_seconds(optional)
  local in="$1" out="$2" audio="$3" trim="${4:-}"
  local t=(); [ -n "$trim" ] && t=(-t "$trim")
  local a=(-an); [ "$audio" = yes ] && a=(-c:a aac -b:a 128k)
  ffmpeg -y -v error -i "$in" ${t[@]+"${t[@]}"} -c:v libx264 -crf 23 -preset medium \
    -pix_fmt yuv420p -movflags +faststart "${a[@]}" "$out"
  log "$(basename "$out"): $(size_of "$out")"
}

encode_webm() { # in, out, audio(yes|no), trim_seconds(optional)
  [ "$HAS_VP9" = 1 ] || return 0
  local in="$1" out="$2" audio="$3" trim="${4:-}"
  local t=(); [ -n "$trim" ] && t=(-t "$trim")
  local a=(-an); [ "$audio" = yes ] && a=(-c:a libopus -b:a 96k)
  ffmpeg -y -v error -i "$in" ${t[@]+"${t[@]}"} -c:v libvpx-vp9 -crf 34 -b:v 0 "${a[@]}" "$out"
  log "$(basename "$out"): $(size_of "$out")"
}

poster() { # in, seconds, out
  ffmpeg -y -v error -ss "$2" -i "$1" -frames:v 1 -q:v 3 "$3"
  log "$(basename "$3"): $(size_of "$3")"
}

photo() { # in, out, width
  ffmpeg -y -v error -i "$1" -vf "scale=$3:-2" -q:v 3 "$2"
  log "$(basename "$2"): $(size_of "$2") (исходник $(size_of "$1"))"
}

crop() { # in, out, crop_expr (ffmpeg crop=w:h:x:y), width
  ffmpeg -y -v error -i "$1" -vf "crop=$3,scale=$4:-2" -q:v 3 "$2"
  log "$(basename "$2"): $(size_of "$2")"
}

log "=== Видео ==="
encode_mp4 "$V2" "$OUT/climax.mp4" yes
encode_webm "$V2" "$OUT/climax.webm" yes
poster "$V2" 2.9 "$OUT/climax-poster.jpg"

encode_mp4 "$V1" "$OUT/echo.mp4" no
encode_webm "$V1" "$OUT/echo.webm" no
poster "$V1" 0.4 "$OUT/echo-poster.jpg" # кулаки вверху — стоп-кадр цикла

encode_mp4 "$V3" "$OUT/pop.mp4" no 3.4 # чёрный хвост отрезан (Ж13)
encode_webm "$V3" "$OUT/pop.webm" no 3.4
poster "$V3" 0.2 "$OUT/pop-poster.jpg"

log "=== Фото: развороты ==="
photo "$SRC_P/faq-09-DJI-20260628142735-0319-D.jpg" "$OUT/crowd@1600.jpg" 1600
photo "$SRC_P/faq-09-DJI-20260628142735-0319-D.jpg" "$OUT/crowd@800.jpg" 800
photo "$SRC_P/faq-02-DJI-20260531144733-0273-D.jpg" "$OUT/crowd-winter@1600.jpg" 1600
photo "$SRC_P/faq-02-DJI-20260531144733-0273-D.jpg" "$OUT/crowd-winter@800.jpg" 800
photo "$SRC_P/faq-04-PXL-20250928-114752415.jpg" "$OUT/small-group@1600.jpg" 1600
photo "$SRC_P/faq-04-PXL-20250928-114752415.jpg" "$OUT/small-group@800.jpg" 800
photo "$SRC_P/faq-07-DJI-20260628135521-0315-D.jpg" "$OUT/process@1600.jpg" 1600
photo "$SRC_P/faq-07-DJI-20260628135521-0315-D.jpg" "$OUT/process@800.jpg" 800
photo "$SRC_P/faq-03-image.png" "$OUT/door@800.jpg" 800
photo "$SRC_P/faq-05-letnee-raspisanie.png" "$OUT/poster-archive@1200.jpg" 1200

log "=== Фото: фигура автора (alpha сохраняется) ==="
ffmpeg -y -v error -i "$SRC_P/faq-08-P1530623.png" -vf "scale=900:-2" "$OUT/ilya@900.png"
log "ilya@900.png: $(size_of "$OUT/ilya@900.png")"

log "=== Мемы (без обработки — фактура подлинности, DL 7.9) ==="
cp "$SRC_P/faq-01-image.png" "$OUT/meme-scam.png"
cp "$SRC_P/faq-10-a14ba0a8.png" "$OUT/meme-money.png"
cp "$SRC_P/faq-06-163421.jpg" "$OUT/meme-friends.jpg"
log "мемы скопированы как есть"

log "=== Вертикальные фрагменты («фрагмент→целое», DL 7.4-7.5) ==="
# crowd 1280x720: фрагмент 4:5 вокруг сидящей пары в центре (лица целы — проверить визуально!)
crop "$SRC_P/faq-09-DJI-20260628142735-0319-D.jpg" "$OUT/crowd-vert@800.jpg" "500:625:390:60" 800
# process 1280x720: фрагмент вокруг правой пары за ноутбуком
crop "$SRC_P/faq-07-DJI-20260628135521-0315-D.jpg" "$OUT/process-vert@800.jpg" "460:575:820:130" 800

log "=== Фрагменты-перебивки для разгона (сцена 4) ==="
crop "$SRC_P/faq-07-DJI-20260628135521-0315-D.jpg" "$OUT/frag-laptop@800.jpg" "560:400:700:300" 800
crop "$SRC_P/faq-07-DJI-20260628135521-0315-D.jpg" "$OUT/frag-circle@800.jpg" "620:440:60:180" 800
crop "$SRC_P/faq-09-DJI-20260628142735-0319-D.jpg" "$OUT/frag-smile@800.jpg" "520:380:640:220" 800

log "=== Готово ==="
du -sh "$OUT"
