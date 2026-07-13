# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Что это

Одностраничный «сайт-фильм» для мероприятий «Долой уныние» (СПб): 11 сцен, которыми зритель управляет скроллом — ночной пролог → исповедь → зум толпы → разгон → **крик** (видео растёт в fullscreen) → выдох → регистрация → титр. Весь контент (тексты, даты, разметка сцен) живёт в `index.html`. Язык проекта — русский (тексты, комментарии, коммиты).

## Команды

```bash
npm run dev        # dev-сервер (http://localhost:5173)
npm run build      # tsc --noEmit + vite build → dist/ (это и есть проверка типов)
npm run preview    # локальный просмотр прод-сборки
npm run media      # пересборка медиа assets/ → public/media/ (нужен ffmpeg)

DEPLOY_HOST=user@host bash deploy/deploy.sh   # build + rsync dist/ на сервер
```

Тестов и линтера нет — единственная автоматическая проверка это `npm run build`. Ручная приёмка: чек-лист `DESIGN-LANGUAGE.md` §24 и `EXPERIENCE-SCRIPT.md` §14.

Debug-режим: `?debug=1` в URL включает консольные логи `[scene] [scroll] [state] [media] [webgl] [climax]` (см. `src/lib/debug.ts`).

## Архитектура

Стек: Vite + TypeScript + GSAP ScrollTrigger + Lenis + Three.js. Точка входа `src/main.ts` — порядок импортов CSS и инициализации модулей значим (например, `initScreamGrowth()` обязан идти ДО `initClimax()`: класс `is-pinned` переключает старт кульминации на ручной).

Сквозные механики, которые надо понимать перед правками:

- **Состояния страницы** (`src/lib/state.ts`): `night → day → after` на `<html data-state>`. Переходы **необратимы** в рамках сеанса (только вперёд); `after` персистится в sessionStorage — пришедший по шэринг-ссылке не видит «серого утра» повторно. Стили и шейдер атмосферы завязаны на этот атрибут.
- **Reduce-motion — отдельная полноценная постановка**: при `prefers-reduced-motion` Lenis, pin-сцены и дисторшн не создаются вовсе, работает статика с рассветом по IntersectionObserver (`initStateTriggers`). Любая новая анимация должна учитывать эту ветку в `main.ts`.
- **WebGL — lazy и с «правом на отказ»**: three-чанк (~131KB gzip) грузится отдельным динамическим import'ом через `requestIdleCallback` и только при `deviceMemory ≥ 4`, без saveData и без reduce-motion. При отказе не грузится ни байта — всё должно деградировать до CSS.
- **Кульминация** (`src/lib/climax.ts`): удары синхронизированы на 3.4/4.7 с видео; звук — только по явному согласию (`sound-consent.ts`). Тайминги — закон из ART-DIRECTION, не менять произвольно.
- **Сцены**: pinned-сцены в `src/lib/scenes/` (prologue, door, buildup, scream, finale), по CSS-файлу на сцену в `src/styles/scenes/scene{0..8}.css`. Разметка всех сцен — в `index.html` с `data-scene`.
- **Деградация** (`src/lib/degradation.ts`): порядок загрузки медиа и тихие ошибки — сайт обязан работать при отвале любого медиафайла.

## Источники истины (обязательны при изменениях дизайна/контента)

Любая правка визуала или текста сверяется с концептуальными документами; при конфликте «как выглядит» решает `DESIGN-LANGUAGE.md`, «что чувствует» — `CREATIVE-DIRECTION.md`. **`REDESIGN-NOTES.md` — ревизии v2, имеющие силу закона поверх DESIGN-LANGUAGE** (тёмный пролог, заметный моушн, Lenis и Three.js разрешены). Непересмотренные законы: настоящие лица без стока/генерации, лица не режутся, один настоящий звук (крик) только по согласию, необратимость света, доступность (фокус, aria-label на сплит-тексте, контраст AA).

Тексты в `index.html` проходят «тест голоса» — звучит ли строка как живая речь Ильи (`DESIGN-LANGUAGE.md` §20).

Остальные документы: `RESEARCH.md` (аудитория), `ART-DIRECTION.md` (партитура крика), `EXPERIENCE-SCRIPT.md` (сценарий сцен и мобильная режиссура), `.ai-factory/plans/` (планы реализации).

## Перед релизом

1. Даты в сцене 8 (`s8-dates` в `index.html`, помечены TODO).
2. `og:image`/canonical — абсолютные URL боевого домена (doloy-unynie.duckdns.org).
3. Новые медиа: исходники в `assets/` (не коммитятся в готовом виде), обработка через `scripts/prepare-media.sh` → `public/media/`; правила кадрирования — `DESIGN-LANGUAGE.md` §7–8.
